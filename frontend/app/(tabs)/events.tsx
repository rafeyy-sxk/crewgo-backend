import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Animated,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { eventsApi } from '../../services/api';
import type { Event } from '../../types';

// ── Constants ──────────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#FF5A1F',
  background: '#0F0F1A',
  surface: '#1C1C2E',
  surfaceLight: '#252535',
  text: '#FFFFFF',
  textMuted: '#9090A0',
  border: '#2A2A3E',
  success: '#22C55E',
  ai: '#8B5CF6',
};

const CATEGORIES = ['All', 'Music', 'Food', 'Sports', 'Art', 'Tech', 'Fitness', 'Comedy'];

// ── Skeleton Card ──────────────────────────────────────────────────────────────
function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.skeletonImage} />
      <View style={styles.cardBody}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonLineShort} />
        <View style={styles.skeletonButton} />
      </View>
    </Animated.View>
  );
}

// ── Event Card ─────────────────────────────────────────────────────────────────
interface EventCardProps {
  event: Event;
  onInterest: (id: string) => void;
  interestedIds: Set<string>;
  isInterestLoading: boolean;
}

function EventCard({ event, onInterest, interestedIds, isInterestLoading }: EventCardProps) {
  const router = useRouter();
  const isInterested = interestedIds.has(event.id);

  const formattedDate = React.useMemo(() => {
    try {
      const d = new Date(event.start_datetime);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return event.start_datetime;
    }
  }, [event.start_datetime]);

  const priceLabel = event.is_free
    ? 'Free'
    : event.price_min != null
    ? `PKR ${event.price_min.toLocaleString()}`
    : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/event/${event.id}` as any)}
      activeOpacity={0.9}
    >
      {/* Image */}
      {event.image_url ? (
        <Image source={{ uri: event.image_url }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <View style={[styles.cardImage, styles.cardImageFallback]}>
          <Ionicons name="image-outline" size={40} color={COLORS.textMuted} />
        </View>
      )}

      {/* Category badge */}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryBadgeText}>{event.category}</Text>
      </View>

      {/* Card body */}
      <View style={styles.cardBody}>
        {/* Title + price */}
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {event.title}
          </Text>
          {priceLabel && (
            <View style={[styles.priceBadge, event.is_free && styles.freeBadge]}>
              <Text style={[styles.priceBadgeText, event.is_free && styles.freeBadgeText]}>
                {priceLabel}
              </Text>
            </View>
          )}
        </View>

        {/* Venue */}
        {event.venue_name && (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {event.venue_name}
            </Text>
          </View>
        )}

        {/* Date */}
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.metaText}>{formattedDate}</Text>
        </View>

        {/* Interested button */}
        <TouchableOpacity
          style={[styles.interestedBtn, isInterested && styles.interestedBtnActive]}
          onPress={() => onInterest(event.id)}
          disabled={isInterestLoading}
          activeOpacity={0.8}
        >
          {isInterestLoading ? (
            <ActivityIndicator size="small" color={COLORS.text} />
          ) : (
            <>
              <Ionicons
                name={isInterested ? 'checkmark-circle' : 'flash-outline'}
                size={16}
                color={isInterested ? COLORS.text : COLORS.text}
              />
              <Text style={styles.interestedBtnText}>
                {isInterested ? "I'm Going!" : "I'm Interested"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function EventsScreen() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());
  const [activeInterestId, setActiveInterestId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const categoryParam = selectedCategory === 'All' ? undefined : selectedCategory;

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['events', selectedCategory],
    queryFn: () => eventsApi.list({ category: categoryParam }),
    select: (res) => (res.data?.data ?? res.data ?? []) as Event[],
  });

  const interestMutation = useMutation({
    mutationFn: (id: string) => eventsApi.interest(id),
    onMutate: (id) => {
      setActiveInterestId(id);
      setInterestedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (_, id) => {
      // Revert optimistic update
      setInterestedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      Alert.alert('Error', 'Could not register interest. Please try again.');
    },
    onSettled: () => {
      setActiveInterestId(null);
    },
  });

  const handleInterest = useCallback(
    (id: string) => {
      interestMutation.mutate(id);
    },
    [interestMutation]
  );

  const events: Event[] = data ?? [];

  const renderItem = useCallback(
    ({ item }: { item: Event }) => (
      <EventCard
        event={item}
        onInterest={handleInterest}
        interestedIds={interestedIds}
        isInterestLoading={activeInterestId === item.id && interestMutation.isPending}
      />
    ),
    [handleInterest, interestedIds, activeInterestId, interestMutation.isPending]
  );

  const keyExtractor = useCallback((item: Event) => item.id, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <View style={styles.cityChip}>
          <Ionicons name="location" size={12} color={COLORS.primary} />
          <Text style={styles.cityChipText}>Lahore</Text>
        </View>
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
        style={styles.categoriesScroll}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(cat)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === cat && styles.categoryChipTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Events list */}
      {isLoading ? (
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={(item) => String(item)}
          renderItem={() => <SkeletonCard />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={events}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            events.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="flash-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No events found</Text>
              <Text style={styles.emptySubtitle}>
                {selectedCategory === 'All'
                  ? 'Check back soon for upcoming events in Lahore.'
                  : `No ${selectedCategory} events right now. Try another category.`}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  cityChipText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  categoriesScroll: {
    maxHeight: 48,
    marginBottom: 4,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: COLORS.text,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardImage: {
    width: '100%',
    height: 160,
  },
  cardImageFallback: {
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: 14,
    gap: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    lineHeight: 22,
  },
  priceBadge: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 2,
  },
  freeBadge: {
    backgroundColor: COLORS.success + '20',
    borderColor: COLORS.success + '60',
  },
  priceBadgeText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  freeBadgeText: {
    color: COLORS.success,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    color: COLORS.textMuted,
    fontSize: 12,
    flex: 1,
  },
  interestedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 4,
  },
  interestedBtnActive: {
    backgroundColor: COLORS.success,
  },
  interestedBtnText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  // Skeleton
  skeletonImage: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.surfaceLight,
  },
  skeletonTitle: {
    height: 18,
    width: '75%',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 6,
    marginBottom: 4,
  },
  skeletonLine: {
    height: 13,
    width: '55%',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 6,
  },
  skeletonLineShort: {
    height: 13,
    width: '40%',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 6,
  },
  skeletonButton: {
    height: 42,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceLight,
    marginTop: 4,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
