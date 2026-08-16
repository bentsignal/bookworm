import { Pressable, Text } from "react-native";

export function ReadButton({
  format,
  onPress,
}: {
  format: "epub" | "pdf";
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`Read ${format.toUpperCase()}`}
      accessibilityRole="button"
      className="border-border bg-card mt-6 h-12 items-center justify-center rounded-full border active:opacity-70"
      onPress={onPress}
    >
      <Text className="text-foreground text-[15px] font-semibold">
        Read {format.toUpperCase()}
      </Text>
    </Pressable>
  );
}

export function BookActions({
  convertedEpubUri,
  exportedUri,
  format,
  isConverting,
  onConvert,
  onDelete,
  onExport,
}: {
  convertedEpubUri: string | undefined;
  exportedUri: string | undefined;
  format: "epub" | "pdf";
  isConverting: boolean;
  onConvert: () => void;
  onDelete: () => void;
  onExport: () => void;
}) {
  const label = format === "pdf" ? "Export clean PDF" : "Export clean EPUB";
  const buttonClassName =
    format === "pdf" ? "border-border bg-card mt-4 border" : "bg-primary mt-8";
  const labelClassName =
    format === "pdf" ? "text-foreground" : "text-primary-foreground";
  return (
    <>
      <ConversionAction
        convertedEpubUri={convertedEpubUri}
        format={format}
        isConverting={isConverting}
        onConvert={onConvert}
      />
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        className={`${buttonClassName} h-12 items-center justify-center rounded-full active:opacity-75`}
        onPress={onExport}
      >
        <Text className={`${labelClassName} text-[15px] font-semibold`}>
          {label}
        </Text>
      </Pressable>
      <Text className="text-muted-foreground mt-3 text-center text-xs">
        {exportCaption(exportedUri)}
      </Text>
      <Pressable
        accessibilityLabel="Remove from lib"
        accessibilityRole="button"
        className="mt-9 items-center py-3"
        onPress={onDelete}
      >
        <Text className="text-accent text-[15px]">Remove from lib</Text>
      </Pressable>
    </>
  );
}

function ConversionAction({
  convertedEpubUri,
  format,
  isConverting,
  onConvert,
}: {
  convertedEpubUri: string | undefined;
  format: "epub" | "pdf";
  isConverting: boolean;
  onConvert: () => void;
}) {
  if (format !== "pdf") return null;
  const label = isConverting ? "Creating EPUB…" : "Create EPUB";
  const caption = convertedEpubUri
    ? "Latest EPUB saved in Files"
    : "Uses your reading order and keeps the PDF";
  return (
    <>
      <Pressable
        accessibilityLabel="Create EPUB"
        accessibilityRole="button"
        className="bg-primary mt-8 h-12 items-center justify-center rounded-full active:opacity-75 disabled:opacity-50"
        disabled={isConverting}
        onPress={onConvert}
      >
        <Text className="text-primary-foreground text-[15px] font-semibold">
          {label}
        </Text>
      </Pressable>
      <Text className="text-muted-foreground mt-3 text-center text-xs">
        {caption}
      </Text>
    </>
  );
}

function exportCaption(exportedUri: string | undefined) {
  return exportedUri
    ? "Latest edition saved in Files"
    : "Your original stays untouched";
}
