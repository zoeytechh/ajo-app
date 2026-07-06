import React, { useEffect, useRef } from 'react';
import { View, Animated, StatusBar, Dimensions, Easing } from 'react-native';
import AjoLogo from '../src/components/AjoLogo';

const { height } = Dimensions.get('window');

interface SplashScreenProps {
  onComplete?: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const containerScale   = useRef(new Animated.Value(0.88)).current;
  const accentOpacity    = useRef(new Animated.Value(0)).current;
  const accentY          = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(containerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(containerScale, {
        toValue: 1,
        tension: 45,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(accentOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(accentY, { toValue: 0, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    }, 600);

    if (onComplete) {
      setTimeout(onComplete, 3000);
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <Animated.View
        style={{
          opacity: containerOpacity,
          transform: [{ scale: containerScale }],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AjoLogo width={280} height={255} />
      </Animated.View>

      <Animated.View
        style={{
          position: 'absolute',
          bottom: height * 0.12,
          opacity: accentOpacity,
          transform: [{ translateY: accentY }],
          alignItems: 'center',
        }}
      >
        <View style={{ width: 32, height: 4, backgroundColor: '#0035F0', borderRadius: 2 }} />
      </Animated.View>
    </View>
  );
}
