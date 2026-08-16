const fs = require("node:fs");
const path = require("node:path");

const {
  IOSConfig,
  withDangerousMod,
  withXcodeProject,
} = require("expo/config-plugins");

const { getProjectName } = IOSConfig.XcodeUtils;

function addIconFileToProject(project, projectName, iconName) {
  IOSConfig.XcodeUtils.addResourceFileToGroup({
    filepath: `${projectName}/${iconName}.icon`,
    groupName: projectName,
    isBuildFile: true,
    project,
    verbose: true,
  });
}

function setAlternateIconNames(project, iconNames) {
  const target = project.getFirstTarget().firstTarget;
  const configurations = IOSConfig.XcodeUtils.getBuildConfigurationsForListId(
    project,
    target.buildConfigurationList,
  );

  for (const [, configuration] of configurations) {
    if (!configuration?.buildSettings) continue;
    configuration.buildSettings.ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES =
      iconNames;
  }
}

const withIosAlternateIcons = (config, { icons }) => {
  config = withDangerousMod(config, [
    "ios",
    async (nextConfig) => {
      const projectRoot = nextConfig.modRequest.projectRoot;
      const projectName = getProjectName(projectRoot);
      const iosAppRoot = path.join(
        nextConfig.modRequest.platformProjectRoot,
        projectName,
      );

      for (const icon of icons) {
        const source = path.resolve(projectRoot, icon.path);
        const destination = path.join(iosAppRoot, `${icon.name}.icon`);
        await fs.promises.rm(destination, { force: true, recursive: true });
        await fs.promises.cp(source, destination, { recursive: true });
      }

      return nextConfig;
    },
  ]);

  return withXcodeProject(config, (nextConfig) => {
    const projectName = getProjectName(nextConfig.modRequest.projectRoot);
    const iconNames = icons.map((icon) => icon.name);

    for (const iconName of iconNames) {
      addIconFileToProject(nextConfig.modResults, projectName, iconName);
    }
    setAlternateIconNames(nextConfig.modResults, iconNames);

    return nextConfig;
  });
};

module.exports = withIosAlternateIcons;
