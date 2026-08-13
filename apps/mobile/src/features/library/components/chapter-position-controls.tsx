import { useEffect, useRef } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { Host, Slider } from "@expo/ui/swift-ui";

import type { BookFormat } from "@worm/ebook-core";

import { useColor } from "~/hooks/use-color";

export function ChapterPositionControls({
  format,
  maximum,
  onChange,
  onInputFocus,
  value,
}: {
  format: BookFormat;
  maximum: number;
  onChange: (value: number) => void;
  onInputFocus?: () => void;
  value: number;
}) {
  const noun = format === "pdf" ? "Page" : "Text block";
  return (
    <View className="gap-2">
      <View className="flex-row justify-between">
        <Text className="text-muted-foreground text-xs">1</Text>
        <Text className="text-muted-foreground text-xs">{maximum}</Text>
      </View>
      <Host style={{ height: 36 }}>
        <Slider
          max={maximum}
          min={1}
          onValueChange={onChange}
          step={1}
          value={value}
        />
      </Host>
      <View className="flex-row items-center justify-center gap-3">
        <StepButton
          disabled={value <= 1}
          label={`Previous ${noun.toLowerCase()}`}
          onPress={() => onChange(value - 1)}
          symbol="minus"
        />
        <View className="border-border bg-background h-11 w-44 flex-row items-center rounded-xl border px-4">
          <Text className="text-muted-foreground text-xs">{noun}</Text>
          <PositionInput
            label={`${noun} number`}
            maximum={maximum}
            onChange={onChange}
            onFocus={onInputFocus}
            value={value}
          />
        </View>
        <StepButton
          disabled={value >= maximum}
          label={`Next ${noun.toLowerCase()}`}
          onPress={() => onChange(value + 1)}
          symbol="plus"
        />
      </View>
    </View>
  );
}

function PositionInput({
  label,
  maximum,
  onChange,
  onFocus,
  value,
}: {
  label: string;
  maximum: number;
  onChange: (value: number) => void;
  onFocus?: () => void;
  value: number;
}) {
  const input = useRef<TextInput>(null);

  // eslint-disable-next-line no-restricted-syntax -- Native text is synchronized without a controlled TextInput so long numeric entry stays responsive.
  useEffect(() => {
    input.current?.setNativeProps({ text: String(value) });
  }, [value]);

  return (
    <TextInput
      accessibilityLabel={label}
      className="text-foreground ml-3 min-w-16 flex-1 px-1 text-right text-[16px] font-semibold tabular-nums"
      defaultValue={String(value)}
      keyboardType="number-pad"
      maxLength={String(maximum).length}
      onEndEditing={({ nativeEvent }) => {
        const number = Number.parseInt(nativeEvent.text, 10);
        if (Number.isFinite(number)) onChange(number);
      }}
      onFocus={onFocus}
      ref={input}
      selectTextOnFocus
    />
  );
}

function StepButton({
  disabled,
  label,
  onPress,
  symbol,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  symbol: "minus" | "plus";
}) {
  const primary = useColor("primary");
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      className="border-border bg-background h-11 w-11 items-center justify-center rounded-full border"
      disabled={disabled}
      onPress={onPress}
      style={{ opacity: disabled ? 0.3 : 1 }}
    >
      <SymbolView
        fallback={
          <Text className="text-primary text-xl">{fallbackSymbol(symbol)}</Text>
        }
        name={symbol}
        size={19}
        tintColor={primary}
        weight="semibold"
      />
    </Pressable>
  );
}

function fallbackSymbol(symbol: "minus" | "plus") {
  return symbol === "plus" ? "+" : "−";
}
