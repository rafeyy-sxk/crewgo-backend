import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: '#0F0F1A' }}>
      <StatusBar style="light" />

      {/* Background decorative circles */}
      <View
        style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: 'rgba(255,90,31,0.15)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: height * 0.25,
          left: -60,
          width: 160,
          height: 160,
          borderRadius: 80,
          backgroundColor: 'rgba(139,92,246,0.08)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 100,
          left: -80,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: 'rgba(139,92,246,0.1)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -40,
          right: -40,
          width: 140,
          height: 140,
          borderRadius: 70,
          backgroundColor: 'rgba(255,90,31,0.08)',
        }}
      />

      {/* Main content */}
      <View style={{ flex: 1, paddingHorizontal: 32, justifyContent: 'center' }}>
        {/* Logo */}
        <View style={{ marginBottom: 4 }}>
          <Text
            style={{
              fontSize: 76,
              fontWeight: '900',
              color: '#FF5A1F',
              letterSpacing: -3,
              lineHeight: 80,
            }}
          >
            Crew
          </Text>
          <Text
            style={{
              fontSize: 76,
              fontWeight: '900',
              color: '#FFFFFF',
              letterSpacing: -3,
              lineHeight: 80,
              marginTop: -8,
            }}
          >
            GO
          </Text>
        </View>

        {/* Tagline */}
        <Text
          style={{
            fontSize: 18,
            color: '#9090A0',
            marginTop: 14,
            lineHeight: 27,
          }}
        >
          Find your crew.{'\n'}Live the moment.
        </Text>

        {/* Social proof pill */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 28,
            backgroundColor: 'rgba(255,90,31,0.1)',
            borderWidth: 1,
            borderColor: 'rgba(255,90,31,0.25)',
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 8,
            alignSelf: 'flex-start',
            gap: 6,
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#22C55E',
            }}
          />
          <Text style={{ color: '#FF5A1F', fontSize: 13, fontWeight: '600' }}>
            2,400+ crews formed this week
          </Text>
        </View>

        {/* Decorative interest indicators */}
        <View
          style={{
            flexDirection: 'row',
            marginTop: 36,
            gap: 10,
            alignItems: 'center',
          }}
        >
          {[
            { emoji: '🎵', label: 'Music' },
            { emoji: '🍕', label: 'Food' },
            { emoji: '⚽', label: 'Sports' },
            { emoji: '🎭', label: 'Arts' },
          ].map((item, i) => (
            <View key={i} style={{ alignItems: 'center', gap: 5 }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: '#1C1C2E',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#2A2A3E',
                }}
              >
                <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
              </View>
              <Text style={{ color: '#9090A0', fontSize: 10, fontWeight: '500' }}>
                {item.label}
              </Text>
            </View>
          ))}
          <View style={{ alignItems: 'center', gap: 5 }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: '#FF5A1F',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#FF5A1F',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 24 }}>+</Text>
            </View>
            <Text style={{ color: '#FF5A1F', fontSize: 10, fontWeight: '600' }}>More</Text>
          </View>
        </View>

        {/* Feature highlights */}
        <View style={{ marginTop: 44, gap: 14 }}>
          {[
            { icon: '🤖', text: 'AI matches you with compatible crew members' },
            { icon: '⚡', text: 'Join a crew in seconds — no friction' },
            { icon: '📍', text: 'Discover local events happening now' },
          ].map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 18 }}>{item.icon}</Text>
              <Text style={{ color: '#9090A0', fontSize: 14, lineHeight: 20, flex: 1 }}>
                {item.text}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Buttons */}
      <View style={{ paddingHorizontal: 32, paddingBottom: 52, gap: 12 }}>
        {/* Get Started */}
        <TouchableOpacity
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#FF5A1F',
            borderRadius: 16,
            padding: 18,
            alignItems: 'center',
            shadowColor: '#FF5A1F',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 17, letterSpacing: 0.2 }}>
            Get Started
          </Text>
        </TouchableOpacity>

        {/* Login */}
        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.75}
          style={{
            borderWidth: 1.5,
            borderColor: '#2A2A3E',
            borderRadius: 16,
            padding: 18,
            alignItems: 'center',
            backgroundColor: 'rgba(28,28,46,0.5)',
          }}
        >
          <Text style={{ color: '#9090A0', fontWeight: '600', fontSize: 17 }}>
            I have an account
          </Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text
          style={{
            color: '#9090A0',
            fontSize: 12,
            textAlign: 'center',
            lineHeight: 17,
            marginTop: 4,
            opacity: 0.7,
          }}
        >
          By continuing you agree to our{' '}
          <Text style={{ color: '#FF5A1F' }}>Terms</Text> &{' '}
          <Text style={{ color: '#FF5A1F' }}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
}
