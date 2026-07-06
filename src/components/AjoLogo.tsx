import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

// SVG coordinate space the logo was drawn in
const VB_W = 680;
const VB_H = 620;

interface Props {
  width?: number;
  height?: number;
}

export default function AjoLogo({ width = 340, height = 310 }: Props) {
  const ringOpacity    = useRef(new Animated.Value(0)).current;
  const ringScale      = useRef(new Animated.Value(0.85)).current;
  const docOpacity     = useRef(new Animated.Value(0)).current;
  const docTranslateY  = useRef(new Animated.Value(6)).current;
  const ctrOpacity     = useRef(new Animated.Value(0)).current;
  const ctrTranslateY  = useRef(new Animated.Value(6)).current;
  const shieldOpacity  = useRef(new Animated.Value(0)).current;
  const shieldScale    = useRef(new Animated.Value(0.85)).current;
  const nairaOpacity   = useRef(new Animated.Value(0)).current;
  const nairaScale     = useRef(new Animated.Value(0.5)).current;
  const nairaFloat     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const easeOut = Easing.out(Easing.ease);
    const t = (val: Animated.Value, toValue: number, duration: number, delay = 0) =>
      Animated.timing(val, { toValue, duration, delay, easing: easeOut, useNativeDriver: true });

    // Intro plays once
    Animated.parallel([
      t(ringOpacity, 1, 500),        t(ringScale, 1, 500),
      t(docOpacity, 1, 500, 300),    t(docTranslateY, 0, 500, 300),
      t(ctrOpacity, 1, 500, 500),    t(ctrTranslateY, 0, 500, 500),
      t(shieldOpacity, 1, 500, 800), t(shieldScale, 1, 500, 800),
      Animated.sequence([
        Animated.delay(1100),
        Animated.parallel([t(nairaOpacity, 1, 280), t(nairaScale, 1.15, 280)]),
        t(nairaScale, 1, 120),
      ]),
    ]).start(({ finished }) => {
      if (!finished) return;
      // Float: recursive tick starting from 0 — no snap, no loop-reset glitch
      let dir = 1;
      const tick = () => {
        Animated.timing(nairaFloat, {
          toValue: dir * 5,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }).start(({ finished: f }) => { if (f) { dir *= -1; tick(); } });
      };
      tick();
    });

    return () => { nairaFloat.stopAnimation(); };
  }, []);

  const layer = (style: object) => [StyleSheet.absoluteFill, style];

  return (
    <View style={{ width, height }}>
      {/* ── Ring ── */}
      <Animated.View style={layer({ opacity: ringOpacity, transform: [{ scale: ringScale }] })}>
        <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          <Path d="M399.5,77.8 A230,230 0 0,1 556.1,378.7"
            fill="none" stroke="#4D7EFF" strokeWidth="34" strokeLinecap="round" />
          <Path d="M399.5,522.2 A230,230 0 1,1 280.5,77.8"
            fill="none" stroke="#0028C2" strokeWidth="34" strokeLinecap="round" />
        </Svg>
      </Animated.View>

      {/* ── Documents + person-left + person-right ── */}
      <Animated.View style={layer({ opacity: docOpacity, transform: [{ translateY: docTranslateY }] })}>
        <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          <G transform="rotate(-8, 232, 400)">
            <Rect x="175" y="345" width="115" height="110" rx="14" fill="#0028C2" />
            <Line x1="195" y1="375" x2="270" y2="375" stroke="#B3C5FF" strokeWidth="6" strokeLinecap="round" />
            <Line x1="195" y1="400" x2="270" y2="400" stroke="#B3C5FF" strokeWidth="6" strokeLinecap="round" />
            <Line x1="195" y1="425" x2="270" y2="425" stroke="#B3C5FF" strokeWidth="6" strokeLinecap="round" />
          </G>
          <G transform="rotate(8, 447, 400)">
            <Rect x="390" y="345" width="115" height="110" rx="14" fill="#0028C2" />
            <Line x1="410" y1="375" x2="485" y2="375" stroke="#B3C5FF" strokeWidth="6" strokeLinecap="round" />
            <Line x1="410" y1="400" x2="485" y2="400" stroke="#B3C5FF" strokeWidth="6" strokeLinecap="round" />
            <Line x1="410" y1="425" x2="485" y2="425" stroke="#B3C5FF" strokeWidth="6" strokeLinecap="round" />
          </G>
          <Circle cx="270" cy="225" r="26" fill="#0028C2" />
          <Path d="M235,330 L235,278 Q235,258 270,258 Q305,258 305,278 L305,330 Z" fill="#0028C2" />
          <Circle cx="410" cy="225" r="26" fill="#4D7EFF" />
          <Path d="M375,330 L375,278 Q375,258 410,258 Q445,258 445,278 L445,330 Z" fill="#4D7EFF" />
        </Svg>
      </Animated.View>

      {/* ── Person-center ── */}
      <Animated.View style={layer({ opacity: ctrOpacity, transform: [{ translateY: ctrTranslateY }] })}>
        <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          <Circle cx="340" cy="210" r="32" fill="#0035F0" />
          <Path d="M295,345 L295,270 Q295,248 340,248 Q385,248 385,270 L385,345 Z" fill="#0035F0" />
        </Svg>
      </Animated.View>

      {/* ── Shield ── */}
      <Animated.View style={layer({ opacity: shieldOpacity, transform: [{ scale: shieldScale }] })}>
        <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          <Path d="M340,335 L270,355 L270,415 Q270,460 340,480 Q410,460 410,415 L410,355 Z"
            fill="#0035F0" stroke="#FFFFFF" strokeWidth="4" />
          <Path d="M303,408 L328,435 L385,372"
            fill="none" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Animated.View>

      {/* ── Naira badge ── */}
      <Animated.View style={layer({ opacity: nairaOpacity, transform: [{ scale: nairaScale }, { translateY: nairaFloat }] })}>
        <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          <Line x1="460" y1="510" x2="405" y2="565" stroke="#22C55E" strokeWidth="16" strokeLinecap="round" />
          <Circle cx="500" cy="470" r="56" fill="#FFFFFF" stroke="#22C55E" strokeWidth="8" />
          <SvgText x="500" y="493" textAnchor="middle"
            fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="60" fill="#22C55E">
            N
          </SvgText>
          <Line x1="470" y1="463" x2="530" y2="463" stroke="#22C55E" strokeWidth="7" />
          <Line x1="470" y1="478" x2="530" y2="478" stroke="#22C55E" strokeWidth="7" />
        </Svg>
      </Animated.View>
    </View>
  );
}
