import type { ViewStyle } from "react-native";
import {
  PanResponder,
  Platform,
  Pressable,
  Text,
  useColorScheme,
  View,
} from "react-native";
import {
  KeyboardController,
  KeyboardStickyView,
  useKeyboardState,
} from "react-native-keyboard-controller";
import Animated, { LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

import { useColor } from "~/hooks/use-color";

export function ChapterControlsPanel({
  children,
  expanded,
  onExpandedChange,
}: {
  children: React.ReactNode;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  const card = useColor("card");
  const border = useColor("border");
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  function changeExpanded(nextExpanded: boolean) {
    onExpandedChange(nextExpanded);
  }
  const panelSwipe = createPanelSwipe({
    keyboardVisible,
    onExpandedChange: changeExpanded,
  });
  const surfaceStyle = {
    borderColor: border,
    borderRadius: expanded ? 26 : 22,
    borderWidth: isLiquidGlassAvailable() ? 0 : 1,
    overflow: "hidden" as const,
  };

  return (
    <KeyboardStickyView
      enabled={keyboardVisible}
      offset={{ closed: 0, opened: 0 }}
      pointerEvents="box-none"
      style={{ bottom: 0, left: 0, position: "absolute", right: 0 }}
    >
      <Animated.View
        layout={panelTransition}
        pointerEvents="box-none"
        style={{
          paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 12),
          paddingHorizontal: 12,
        }}
      >
        <Animated.View
          {...panelSwipe.panHandlers}
          layout={panelTransition}
          style={shadowStyle(colorScheme, surfaceStyle)}
        >
          <PanelSurface
            backgroundColor={card}
            colorScheme={colorScheme}
            style={surfaceStyle}
          >
            <View>
              <PanelHeader
                expanded={expanded}
                onPress={() => changeExpanded(!expanded)}
              />
              <ExpandedControls expanded={expanded}>
                {children}
              </ExpandedControls>
            </View>
          </PanelSurface>
        </Animated.View>
      </Animated.View>
    </KeyboardStickyView>
  );
}

function PanelSurface({
  backgroundColor,
  children,
  colorScheme,
  style,
}: {
  backgroundColor: string;
  children: React.ReactElement;
  colorScheme: "dark" | "light";
  style: ViewStyle;
}) {
  if (Platform.OS !== "ios" || !isLiquidGlassAvailable()) {
    return <View style={[style, { backgroundColor }]}>{children}</View>;
  }
  return (
    <GlassView
      colorScheme={colorScheme}
      glassEffectStyle={{ animate: true, style: "regular" }}
      style={style}
    >
      {children}
    </GlassView>
  );
}

function ExpandedControls({
  children,
  expanded,
}: {
  children: React.ReactNode;
  expanded: boolean;
}) {
  if (!expanded) return null;
  return <View className="gap-4 px-4 pb-4">{children}</View>;
}

function PanelHeader({
  expanded,
  onPress,
}: {
  expanded: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityHint={
        expanded ? "Collapses chapter controls" : "Expands chapter controls"
      }
      accessibilityRole="button"
      className="items-center px-5 pt-2 pb-3"
      onPress={onPress}
    >
      <View className="bg-muted-foreground/50 mb-2 h-1 w-9 rounded-full" />
      <Text className="text-foreground text-[15px] font-semibold">
        Controls
      </Text>
    </Pressable>
  );
}

function createPanelSwipe({
  keyboardVisible,
  onExpandedChange,
}: {
  keyboardVisible: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  return PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) =>
      Math.abs(gesture.dy) > 10 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy < -swipeDistance) return onExpandedChange(true);
      if (gesture.dy <= swipeDistance) return;
      if (!keyboardVisible && !KeyboardController.isVisible()) {
        return onExpandedChange(false);
      }
      void KeyboardController.dismiss();
    },
  });
}

function shadowStyle(colorScheme: "dark" | "light", surface: ViewStyle) {
  return {
    borderRadius: surface.borderRadius,
    elevation: 10,
    shadowColor: "#000000",
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: colorScheme === "dark" ? 0.35 : 0.14,
    shadowRadius: 14,
  };
}

const swipeDistance = 28;
const panelTransition = LinearTransition.springify().damping(24).stiffness(240);
