import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  ActivityIndicator,
  Dimensions,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { eventsApi, crewsApi } from '../../services/api';
import { COLORS } from '../../constants/config';
import { Event, User } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 250;

// ─── Mock "who's going" avatars ───────────────────────────────────────────────
const MOCK_GOING = [
  { id: '1', initials: 'AK', color: '#FF5A1F' },
  { id: '2', initials: 'SM', color: '#8B5CF6' },
  { id: '3', initials: 'RL', color: '#22C55E' },
  { id: '4', initials: 'NY', color: '#F59E0B' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeroImage({ uri }: { uri?: string }) {
  return (
    <View style={styles.heroContainer}>
      {uri ? (
        <Image source={{ uri }} style={styles.heroImage} resizeMode="cover" />
      ) : (
        <View style={[styles.heroImage, styles.heroPlaceholder]}>
          <Ionicons name="image-outline" size={48} color={COLORS.border} />
        </View>
      )}
      {/* Bottom gradient overlay via layered Views */}
      <View style={styles.heroGradient} />
    </View>
  );
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <View style={styles.categoryBadge}>
      <Text style={styles.categoryText}>{category}</Text>
    </View>
  );
}

function PriceBadge({ isFree, min, max }: { isFree: boolean; min?: number; max?: number }) {
  const label = isFree
    ? 'Free'
    : min != null
    ? max != null && max !== min
      ? `$${min}–$${max}`
      : `$${min}`
    : 'Paid';

  return (
    <View style={[styles.priceBadge, isFree && styles.priceBadgeFree]}>
      <Text style={[styles.priceText, isFree && styles.priceTextFree]}>{label}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  children,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  onPress?: () => void;
}) {
  const Wrapper: any = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={styles.infoRow}
    >
      <Ionicons name={icon} size={18} color={COLORS.textMuted} style={styles.infoIcon} />
      {children}
    </Wrapper>
  );
}

function CollapsibleDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const SHORT_LIMIT = 160;
  const isLong = text.length > SHORT_LIMIT;
  const displayed = expanded || !isLong ? text : text.slice(0, SHORT_LIMIT) + '…';

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.description}>{displayed}</Text>
      {isLong && (
        <TouchableOpacity onPress={() => setExpanded((v) => !v)} activeOpacity={0.7} style={{ marginTop: 6 }}>
          <Text style={styles.showMoreText}>{expanded ? 'Show less' : 'Show more'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function AvatarCircle({
  initials,
  color,
  size = 40,
}: {
  initials: string;
  color: string;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.avatarCircle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      <Text style={[styles.avatarInitials, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

interface SuggestedPerson {
  user_id: string;
  full_name: string;
  shared_interests_count: number;
  avatar_url?: string;
}

function SuggestedCrewCard({ person }: { person: SuggestedPerson }) {
  const initials = person.full_name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <View style={styles.suggestedCard}>
      {person.avatar_url ? (
        <Image source={{ uri: person.avatar_url }} style={styles.suggestedAvatar} />
      ) : (
        <AvatarCircle initials={initials} color={COLORS.ai} size={44} />
      )}
      <View style={{ marginTop: 8, alignItems: 'center' }}>
        <Text style={styles.suggestedName} numberOfLines={1}>
          {person.full_name.split(' ')[0]}
        </Text>
        <Text style={styles.suggestedMeta}>
          {person.shared_interests_count} shared
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: eventData,
    isLoading: eventLoading,
    isError: eventError,
  } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.get(id).then((r) => r.data as Event),
    enabled: !!id,
  });

  const {
    data: suggestedData,
    isLoading: suggestedLoading,
  } = useQuery({
    queryKey: ['suggested-crew', id],
    queryFn: () => crewsApi.getSuggestedCrew(id).then((r) => r.data as SuggestedPerson[]),
    enabled: !!id,
    retry: 1,
  });

  const interestMutation = useMutation({
    mutationFn: () => eventsApi.interest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      Alert.alert('You\'re in!', 'You marked interest in this event.');
    },
    onError: () => {
      Alert.alert('Error', 'Could not update interest. Please try again.');
    },
  });

  const openMaps = useCallback(() => {
    if (!eventData) return;
    const query = encodeURIComponent(
      eventData.venue_address || eventData.venue_name || ''
    );
    const url =
      Platform.OS === 'ios'
        ? `maps:?q=${query}`
        : `geo:0,0?q=${query}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    });
  }, [eventData]);

  const handleCreateCrew = useCallback(() => {
    if (!eventData) return;
    router.push({
      pathname: '/crew/create' as any,
      params: { eventId: id, eventTitle: eventData.title },
    });
  }, [eventData, id, router]);

  // ── Loading / error states ──────────────────────────────────────────────────
  if (eventLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (eventError || !eventData) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
        <Text style={[styles.errorText, { marginTop: 12 }]}>Failed to load event.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const event = eventData;
  const formattedDate = dayjs(event.start_datetime).format('ddd, MMM D · h:mm A');

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar style="light" />

      {/* Back button — overlaid on hero */}
      <SafeAreaView style={styles.backButtonWrapper} edges={['top']}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.85}
          style={styles.circularBackBtn}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <HeroImage uri={event.image_url} />

        {/* Floating content card */}
        <View style={styles.card}>
          {/* Title */}
          <Text style={styles.title}>{event.title}</Text>

          {/* Category + price row */}
          <View style={styles.badgeRow}>
            <CategoryBadge category={event.category} />
            <PriceBadge isFree={event.is_free} min={event.price_min} max={event.price_max} />
          </View>

          {/* Date */}
          <InfoRow icon="calendar-outline">
            <Text style={styles.infoText}>{formattedDate}</Text>
          </InfoRow>

          {/* Venue */}
          {(event.venue_name || event.venue_address) && (
            <InfoRow icon="location-outline" onPress={openMaps}>
              <View style={{ flex: 1 }}>
                {event.venue_name && (
                  <Text style={[styles.infoText, { color: COLORS.primary }]}>
                    {event.venue_name}
                  </Text>
                )}
                {event.venue_address && (
                  <Text style={[styles.infoText, { fontSize: 13, marginTop: 2 }]}>
                    {event.venue_address}
                  </Text>
                )}
              </View>
              <Ionicons name="open-outline" size={14} color={COLORS.primary} />
            </InfoRow>
          )}

          {/* Description */}
          {event.description && <CollapsibleDescription text={event.description} />}

          <View style={styles.divider} />

          {/* Who's going */}
          <Text style={styles.sectionTitle}>Who's Going</Text>
          <View style={styles.goingRow}>
            {MOCK_GOING.map((p, i) => (
              <View
                key={p.id}
                style={[styles.goingAvatar, i > 0 && { marginLeft: -10 }]}
              >
                <AvatarCircle initials={p.initials} color={p.color} size={38} />
              </View>
            ))}
            <View style={[styles.goingAvatar, { marginLeft: -10 }]}>
              <View style={[styles.avatarCircle, { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.surfaceLight }]}>
                <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: '700' }}>+24</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Suggested crew */}
          <Text style={styles.sectionTitle}>Suggested Crew for You</Text>
          <Text style={styles.sectionSubtitle}>Based on your interests</Text>

          {suggestedLoading ? (
            <ActivityIndicator
              size="small"
              color={COLORS.ai}
              style={{ marginVertical: 16, alignSelf: 'flex-start' }}
            />
          ) : suggestedData && suggestedData.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestedScroll}
            >
              {suggestedData.map((person) => (
                <SuggestedCrewCard key={person.user_id} person={person} />
              ))}
            </ScrollView>
          ) : (
            <Text style={[styles.infoText, { marginTop: 8 }]}>
              No suggestions yet — be the first to show up!
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={styles.stickyBar}>
        <TouchableOpacity
          onPress={() => interestMutation.mutate()}
          disabled={interestMutation.isPending}
          activeOpacity={0.85}
          style={styles.interestedBtn}
        >
          {interestMutation.isPending ? (
            <ActivityIndicator size="small" color={COLORS.text} />
          ) : (
            <>
              <Ionicons name="heart" size={18} color={COLORS.text} style={{ marginRight: 8 }} />
              <Text style={styles.interestedBtnText}>I'm Interested</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleCreateCrew}
          activeOpacity={0.85}
          style={styles.crewBtn}
        >
          <Ionicons name="people-outline" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
          <Text style={styles.crewBtnText}>Create a Crew</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: COLORS.textMuted,
    fontSize: 16,
    textAlign: 'center',
  },

  // Hero
  heroContainer: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: HERO_HEIGHT,
  },
  heroPlaceholder: {
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    // Simulated gradient: multiple semi-transparent layers
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },

  // Back button
  backButtonWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
  circularBackBtn: {
    margin: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15,15,26,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },

  // Card
  card: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  // Title
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.4,
    lineHeight: 30,
    marginBottom: 12,
  },

  // Badges
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  categoryText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  priceBadge: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceBadgeFree: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderColor: COLORS.success,
  },
  priceText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  priceTextFree: {
    color: COLORS.success,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  infoText: {
    color: COLORS.textMuted,
    fontSize: 15,
    flex: 1,
    lineHeight: 20,
  },

  // Description
  description: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  showMoreText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 20,
  },

  // Sections
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 14,
  },

  // Who's going
  goingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  goingAvatar: {
    borderWidth: 2,
    borderColor: COLORS.background,
    borderRadius: 21,
  },

  // Avatar
  avatarCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: COLORS.text,
    fontWeight: '700',
  },

  // Suggested crew
  suggestedScroll: {
    gap: 12,
    paddingRight: 4,
  },
  suggestedCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    width: 88,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  suggestedName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  suggestedMeta: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },

  // Sticky bar
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  interestedBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  interestedBtnText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 16,
  },
  crewBtn: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crewBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 16,
  },
});
