import { Alert } from "react-native";

export function confirmDeleteNote(onDelete: () => void) {
  Alert.alert("Delete this note?", "This can’t be undone.", [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: onDelete },
  ]);
}
