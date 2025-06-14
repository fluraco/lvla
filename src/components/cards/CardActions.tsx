import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../theme';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CardActionsProps {
  onLike: () => void;
  onDislike: () => void;
  onSuperLike: () => void;
}

export function CardActions({ onLike, onDislike, onSuperLike }: CardActionsProps) {
  const handleAction = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    action();
  };

  return (
    <BlurView intensity={20} tint="light" style={styles.container}>
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.dislikeButton]}
          onPress={() => handleAction(onDislike)}
        >
          <MaterialCommunityIcons
            name="close"
            size={30}
            color={COLORS.light.error}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.superLikeButton]}
          onPress={() => handleAction(onSuperLike)}
        >
          <MaterialCommunityIcons
            name="star"
            size={30}
            color={COLORS.light.warning}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => handleAction(onLike)}
        >
          <MaterialCommunityIcons
            name="heart"
            size={30}
            color={COLORS.light.success}
          />
        </TouchableOpacity>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xl,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.light.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dislikeButton: {
    borderWidth: 2,
    borderColor: COLORS.light.error,
  },
  superLikeButton: {
    borderWidth: 2,
    borderColor: COLORS.light.warning,
  },
  likeButton: {
    borderWidth: 2,
    borderColor: COLORS.light.success,
  },
}); 