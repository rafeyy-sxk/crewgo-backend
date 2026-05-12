import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { COLORS } from '../../constants/config';

export default function Login() {
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await authApi.login(email.trim().toLowerCase(), password);
      await setTokens(data.access_token, data.refresh_token);

      // Fetch profile and set user
      const meRes = await authApi.me();
      setUser(meRes.data);

      router.replace('/(tabs)/events');
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Login failed. Please check your credentials.';
      setError(typeof msg === 'string' ? msg : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 }}>
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{ marginBottom: 32, alignSelf: 'flex-start', padding: 4 }}
          >
            <Text style={{ fontSize: 28, color: COLORS.text }}>←</Text>
          </TouchableOpacity>

          {/* Header */}
          <Text
            style={{
              fontSize: 32,
              fontWeight: '800',
              color: COLORS.text,
              marginBottom: 6,
              letterSpacing: -0.5,
            }}
          >
            Welcome back
          </Text>
          <Text style={{ fontSize: 16, color: COLORS.textMuted, marginBottom: 36 }}>
            Sign in to find your crew
          </Text>

          {/* Inputs */}
          <View style={{ gap: 14, marginBottom: 8 }}>
            <View>
              <Text
                style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8 }}
              >
                EMAIL
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                style={{
                  backgroundColor: COLORS.surface,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 12,
                  padding: 16,
                  color: COLORS.text,
                  fontSize: 16,
                }}
              />
            </View>

            <View>
              <Text
                style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8 }}
              >
                PASSWORD
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                style={{
                  backgroundColor: COLORS.surface,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 12,
                  padding: 16,
                  color: COLORS.text,
                  fontSize: 16,
                }}
              />
            </View>
          </View>

          {/* Error message */}
          {!!error && (
            <Text
              style={{
                color: COLORS.error,
                fontSize: 14,
                marginTop: 8,
                marginBottom: 4,
                lineHeight: 20,
              }}
            >
              {error}
            </Text>
          )}

          {/* Spacer */}
          <View style={{ flex: 1, minHeight: 32 }} />

          {/* Login button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
            style={{
              backgroundColor: isLoading ? COLORS.primaryDark ?? COLORS.primary : COLORS.primary,
              borderRadius: 16,
              paddingVertical: 17,
              alignItems: 'center',
              opacity: isLoading ? 0.8 : 1,
              shadowColor: COLORS.primary,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
              elevation: 6,
              marginBottom: 20,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.text} size="small" />
            ) : (
              <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700' }}>Login</Text>
            )}
          </TouchableOpacity>

          {/* Register link */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.7}
            style={{ alignItems: 'center' }}
          >
            <Text style={{ color: COLORS.textMuted, fontSize: 15 }}>
              Don't have an account?{' '}
              <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Register</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
