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

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  city?: string;
  general?: string;
}

export default function Register() {
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('Lahore');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required.';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    }

    if (!city.trim()) {
      newErrors.city = 'City is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const { data } = await authApi.register({
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        city: city.trim(),
      });

      await setTokens(data.access_token, data.refresh_token);

      // Fetch and store user profile
      const meRes = await authApi.me();
      setUser(meRes.data);

      router.replace('/(auth)/interests');
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.response?.data?.message;
      const generalMsg =
        typeof detail === 'string'
          ? detail
          : 'Registration failed. Please try again.';
      setErrors({ general: generalMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    color: COLORS.text,
    fontSize: 16,
  };

  const labelStyle = {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
  };

  const errorTextStyle = {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
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
            Create account
          </Text>
          <Text style={{ fontSize: 16, color: COLORS.textMuted, marginBottom: 36 }}>
            Join CrewGO and find your people
          </Text>

          {/* Form fields */}
          <View style={{ gap: 16, marginBottom: 8 }}>
            {/* Full Name */}
            <View>
              <Text style={labelStyle}>FULL NAME</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Alex Johnson"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="words"
                returnKeyType="next"
                style={[
                  inputStyle,
                  errors.fullName ? { borderColor: COLORS.error } : null,
                ]}
              />
              {errors.fullName ? <Text style={errorTextStyle}>{errors.fullName}</Text> : null}
            </View>

            {/* Email */}
            <View>
              <Text style={labelStyle}>EMAIL</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                style={[
                  inputStyle,
                  errors.email ? { borderColor: COLORS.error } : null,
                ]}
              />
              {errors.email ? <Text style={errorTextStyle}>{errors.email}</Text> : null}
            </View>

            {/* Password */}
            <View>
              <Text style={labelStyle}>PASSWORD</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 8 characters"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                returnKeyType="next"
                style={[
                  inputStyle,
                  errors.password ? { borderColor: COLORS.error } : null,
                ]}
              />
              {errors.password ? <Text style={errorTextStyle}>{errors.password}</Text> : null}
            </View>

            {/* City */}
            <View>
              <Text style={labelStyle}>CITY</Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="Lahore"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                style={[
                  inputStyle,
                  errors.city ? { borderColor: COLORS.error } : null,
                ]}
              />
              {errors.city ? <Text style={errorTextStyle}>{errors.city}</Text> : null}
            </View>
          </View>

          {/* General error */}
          {errors.general ? (
            <Text
              style={{
                color: COLORS.error,
                fontSize: 14,
                marginTop: 8,
                lineHeight: 20,
              }}
            >
              {errors.general}
            </Text>
          ) : null}

          {/* Spacer */}
          <View style={{ flex: 1, minHeight: 32 }} />

          {/* Continue button */}
          <TouchableOpacity
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.85}
            style={{
              backgroundColor: COLORS.primary,
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
              <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700' }}>
                Continue
              </Text>
            )}
          </TouchableOpacity>

          {/* Login link */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.7}
            style={{ alignItems: 'center' }}
          >
            <Text style={{ color: COLORS.textMuted, fontSize: 15 }}>
              Already have an account?{' '}
              <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
