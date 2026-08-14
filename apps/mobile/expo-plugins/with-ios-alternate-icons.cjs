const fs = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const {
  IOSConfig,
  withDangerousMod,
  withInfoPlist,
  withXcodeProject,
} = require("expo/config-plugins");

const execFileAsync = promisify(execFile);

async function writeIconVariant(projectRoot, icon, folder, scale, size) {
  const source = path.resolve(projectRoot, icon.path);
  const destination = path.join(folder, `${icon.name}@${scale}x.png`);
  await execFileAsync(
    "sips",
    [
      "--resampleHeightWidth",
      String(size),
      String(size),
      source,
      "--out",
      destination,
    ],
    { maxBuffer: 1024 * 1024 },
  );
}

function removeExistingIconReferences(project, iconNames) {
  const objects = project.hash?.project?.objects ?? {};
  const buildFiles = objects.PBXBuildFile ?? {};
  const fileReferences = objects.PBXFileReference ?? {};
  const groups = objects.PBXGroup ?? {};
  const resourcesBuildPhases = objects.PBXResourcesBuildPhase ?? {};
  const names = new Set(iconNames);

  for (const [key, buildFile] of Object.entries(buildFiles)) {
    const fileName = buildFile?.fileRef_comment;
    const iconName = typeof fileName === "string" ? fileName.split("@")[0] : "";
    if (names.has(iconName)) delete buildFiles[key];
  }

  for (const buildPhase of Object.values(resourcesBuildPhases)) {
    if (!buildPhase || typeof buildPhase !== "object") continue;
    buildPhase.files = (buildPhase.files ?? []).filter((file) => {
      const comment = typeof file?.comment === "string" ? file.comment : "";
      return !names.has(comment.split("@")[0]);
    });
  }

  for (const [key, fileReference] of Object.entries(fileReferences)) {
    const fileName = fileReference?.name;
    const iconName = typeof fileName === "string" ? fileName.split("@")[0] : "";
    if (names.has(iconName)) delete fileReferences[key];
  }

  for (const [key, group] of Object.entries(groups)) {
    if (key.endsWith("_comment") || !group || typeof group !== "object")
      continue;
    group.children = (group.children ?? []).filter(
      (child) => !names.has(child?.comment),
    );
    if (names.has(group.name)) {
      delete groups[key];
      delete groups[`${key}_comment`];
    }
  }
}

function addIconResource(project, projectName, iconName, filePath) {
  const appGroup = project.findPBXGroupKey({ name: projectName });
  let iconGroup = project.findPBXGroupKey({ name: iconName });
  const objects = project.hash.project.objects;
  const basename = path.basename(filePath);

  if (!iconGroup) {
    iconGroup = project.pbxCreateGroup(iconName, `${projectName}/${iconName}`);
    project.addToPbxGroup(iconGroup, appGroup);
  }

  const fileRef = project.generateUuid();
  const buildFile = project.generateUuid();
  objects.PBXFileReference[fileRef] = {
    explicitFileType: "undefined",
    fileEncoding: "undefined",
    includeInIndex: 0,
    isa: "PBXFileReference",
    lastKnownFileType: "image.png",
    name: `"${basename}"`,
    path: `"${filePath}"`,
    sourceTree: "'<absolute>'",
  };
  objects.PBXFileReference[`${fileRef}_comment`] = basename;
  objects.PBXBuildFile[buildFile] = {
    fileRef,
    fileRef_comment: basename,
    isa: "PBXBuildFile",
  };
  objects.PBXBuildFile[`${buildFile}_comment`] = `${basename} in Resources`;

  for (const [key, buildPhase] of Object.entries(
    objects.PBXResourcesBuildPhase,
  )) {
    if (
      key.endsWith("_comment") ||
      !buildPhase ||
      typeof buildPhase !== "object"
    ) {
      continue;
    }
    buildPhase.files = buildPhase.files ?? [];
    buildPhase.files.push({
      comment: `${basename} in Resources`,
      value: buildFile,
    });
  }

  objects.PBXGroup[iconGroup].children =
    objects.PBXGroup[iconGroup].children ?? [];
  objects.PBXGroup[iconGroup].children.push({
    comment: basename,
    value: fileRef,
  });
}

const withIosAlternateIcons = (config, { icons }) => {
  config = withInfoPlist(config, (nextConfig) => {
    nextConfig.modResults.CFBundleIcons = {
      CFBundleAlternateIcons: Object.fromEntries(
        icons.map((icon) => [
          icon.name,
          { CFBundleIconFiles: [icon.name], UIPrerenderedIcon: false },
        ]),
      ),
      CFBundlePrimaryIcon: {
        CFBundleIconFiles: [],
        UIPrerenderedIcon: false,
      },
    };
    return nextConfig;
  });

  config = withDangerousMod(config, [
    "ios",
    async (nextConfig) => {
      const projectName = IOSConfig.XcodeUtils.getProjectName(
        nextConfig.modRequest.projectRoot,
      );
      const appFolder = path.join(
        nextConfig.modRequest.platformProjectRoot,
        projectName,
      );
      for (const icon of icons) {
        const folder = path.join(appFolder, icon.name);
        fs.mkdirSync(folder, { recursive: true });
        await writeIconVariant(
          nextConfig.modRequest.projectRoot,
          icon,
          folder,
          2,
          120,
        );
        await writeIconVariant(
          nextConfig.modRequest.projectRoot,
          icon,
          folder,
          3,
          180,
        );
      }
      return nextConfig;
    },
  ]);

  config = withXcodeProject(config, (nextConfig) => {
    const projectName = IOSConfig.XcodeUtils.getProjectName(
      nextConfig.modRequest.projectRoot,
    );
    const appFolder = path.join(
      nextConfig.modRequest.platformProjectRoot,
      projectName,
    );
    removeExistingIconReferences(
      nextConfig.modResults,
      icons.map((icon) => icon.name),
    );
    for (const icon of icons) {
      addIconResource(
        nextConfig.modResults,
        projectName,
        icon.name,
        path.join(appFolder, icon.name, `${icon.name}@2x.png`),
      );
      addIconResource(
        nextConfig.modResults,
        projectName,
        icon.name,
        path.join(appFolder, icon.name, `${icon.name}@3x.png`),
      );
    }
    return nextConfig;
  });

  return config;
};

module.exports = withIosAlternateIcons;
