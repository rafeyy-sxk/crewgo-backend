import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Event } from '../../types';
import dayjs from 'dayjs';

interface EventCardProps {
  event: Event;
  onInterest?: (id: string) => void;
}

export function EventCard({ event, onInterest }: EventCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push(`/event/${event.id}` as any)}
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        {event.image_url ? (
          <Image source={{ uri: event.image_url }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Text style={styles.imageFallbackEmoji}>
              {event.category === 'Music' ? '🎵' : event.category === 'Food' ? '🍕' : event.category === 'Sports' ? '⚽' : '🎭'}
            </Text>
          </View>
        )}
        {/* Category badge */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{event.category}</Text>
        </View>
        {/* Free badge */}
        {event.is_free && (
          <View style={styles.freeBadge}>
            <Text style={styles.freeText}>FREE</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>

        <View style={styles.row}>
          <Ionicons name="location-outline" size={13} color="#9090A0" />
          <Text style={styles.meta} numberOfLines={1}>
            {event.venue_name || event.venue_address || 'Lahore'}
          </Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="time-outline" size={13} color="#9090A0" />
          <Text style={styles.meta}>
            {dayjs(event.start_datetime).format('ddd, MMM D · h:mm A')}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.interestBtn}
          onPress={() => onInterest?.(event.id)}
          activeOpacity={0.8}
        >
          <Ionicons name="flash" size={15} color="#fff" />
          <Text style={styles.interestBtnText}>I'm Interested</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1C1C2E',
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 160 },
  imageFallback: { backgroundColor: '#252535', justifyContent: 'center', alignItems: 'center' },
  imageFallbackEmoji: { fontSize: 52 },
  categoryBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: '#FF5A1F', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  categoryText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  freeBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: '#22C55E', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  freeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  content: { padding: 14 },
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 8, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  meta: { color: '#9090A0', fontSize: 13, flex: 1 },
  interestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#FF5A1F', borderRadius: 12,
    paddingVertical: 12, marginTop: 10,
  },
  interestBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
