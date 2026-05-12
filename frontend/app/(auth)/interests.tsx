import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usersApi } from '../../services/api';
import { COLORS, INTEREST_OPTIONS } from '../../constants/config';

const MIN_SELECTIONS = 3;

export default function Interests() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleInterest = (interest: string) => {
    setSelected((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleContinue = async () => {
    if (selected.length < MIN_SELECTIONS) return;

    setIsLoading(true);
    setError('');

    try {
      await usersApi.updateInterests(selected);
      router.replace('/(tabs)/events');
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Failed to save interests. Please try again.';
      setError(typeof msg === 'string' ? msg : 'Failed to save interests.');
    } finally {
      setIsLoading(false);
    }
  };

  const canContinue = selected.length >= MIN_SELECTIONS;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: 64,
          paddingHorizontal: 24,
          paddingBottom: 160,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text
          style={{
            fontSize: 30,
            fontWeight: '800',
            color: COLORS.text,
            marginBottom: 8,
            letterSpacing: -0.5,
          }}
        >
          What are you into?
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: COLORS.textMuted,
            lineHeight: 22,
            marginBottom: 32,
          }}
        >
          Pick at least {MIN_SELECTIONS} interests to find your perfect crew
        </Text>

        {/* Selection counter */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 24,
            gap: 8,
          }}
        >
          <View
            style={{
              backgroundColor: canContinue ? COLORS.primary : COLORS.surface,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: canContinue ? COLORS.primary : COLORS.border,
            }}
          >
            <Text
              style={{
                color: canContinue ? COLORS.text : COLORS.textMuted,
                fontSize: 13,
                fontWeight: '700',
              }}
            >
              {selected.length} selected
            </Text>
          </View>
          {!canContinue && (
            <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>
              {MIN_SELECTIONS - selected.length} more to go
            </Text>
          )}
          {canContinue && (
            <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>
              You're good to go!
            </Text>
          )}
        </View>

        {/* Interest chips grid */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          {INTEREST_OPTIONS.map((interest) => {
            const isSelected = selected.includes(interest);
            return (
              <TouchableOpacity
                key={interest}
                onPress={() => toggleInterest(interest)}
                activeOpacity={0.75}
                style={{
                  backgroundColor: isSelected ? COLORS.primary : COLORS.surface,
                  borderWidth: 1.5,
                  borderColor: isSelected ? COLORS.primary : COLORS.border,
                  borderRadius: 40,
                  paddingHorizontal: 20,
                  paddingVertical: 11,
                  shadowColor: isSelected ? COLORS.primary : 'transparent',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isSelected ? 0.3 : 0,
                  shadowRadius: 8,
                  elevation: isSelected ? 4 : 0,
                }}
              >
                <Text
                  style={{
                    color: isSelected ? COLORS.text : COLORS.textMuted,
                    fontSize: 15,
                    fontWeight: isSelected ? '700' : '500',
                  }}
                >
                  {interest}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Error */}
        {!!error && (
          <Text
            style={{
              color: COLORS.error,
              fontSize: 14,
              marginTop: 20,
              textAlign: 'center',
            }}
          >
            {error}
          </Text>
        )}
      </ScrollView>

      {/* Fixed bottom button */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 24,
          paddingBottom: Platform.OS === 'ios' ? 44 : 28,
          paddingTop: 16,
          backgroundColor: COLORS.background,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        }}
      >
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!canContinue || isLoading}
          activeOpacity={0.85}
          style={{
            backgroundColor: canContinue ? COLORS.primary : COLORS.surface,
            borderRadius: 16,
            paddingVertical: 17,
            alignItems: 'center',
            opacity: !canContinue || isLoading ? 0.6 : 1,
            shadowColor: canContinue ? COLORS.primary : 'transparent',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: canContinue ? 6 : 0,
          }}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.text} size="small" />
          ) : (
            <Text
              style={{
                color: canContinue ? COLORS.text : COLORS.textMuted,
                fontSize: 17,
                fontWeight: '700',
              }}
            >
              Let's Go 🚀
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
