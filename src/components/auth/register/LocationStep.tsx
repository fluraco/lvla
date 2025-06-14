import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-elements';
import * as Location from 'expo-location';
import { useRegister } from '../../../contexts/RegisterContext';
import { SPACING } from '../../../theme';
import Animated, { 
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RegisterStepLayout } from './RegisterStepLayout';

export function LocationStep() {
  const { state, dispatch } = useRegister();
  const [location, setLocation] = useState(state.location);
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

  const scale = useSharedValue(1);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setPermissionStatus(status);
    if (status === 'granted') {
      getLocation();
    }
  };

  const getLocation = async () => {
    try {
      setLoading(true);
      const location = await Location.getCurrentPositionAsync({});
      const address = await reverseGeocode(location.coords);
      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        city: address?.city || '',
        country: address?.country || '',
      });
    } catch (error) {
      console.error('Konum alma hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocode = async (coords: { latitude: number; longitude: number }) => {
    try {
      const [address] = await Location.reverseGeocodeAsync(coords);
      return address;
    } catch (error) {
      console.error('Adres çözümleme hatası:', error);
      return null;
    }
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (location) {
        dispatch({ type: 'SET_LOCATION', payload: location });
      }
      dispatch({ type: 'NEXT_STEP' });
    } catch (error) {
      console.error('Konum kaydetme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    dispatch({ type: 'NEXT_STEP' });
  };

  const handlePressIn = () => {
    scale.value = withSpring(0.98, {
      damping: 15,
      stiffness: 300,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <RegisterStepLayout
      title="Konumun"
      subtitle="Yakınındaki kişilerle tanışmak için konumunu paylaş"
      currentStep={4}
      totalSteps={8}
      onNext={handleNext}
      onSkip={handleSkip}
      loading={loading}
      showSkip={permissionStatus !== 'granted'}
    >
      <View style={styles.locationContainer}>
        {permissionStatus === 'granted' ? (
          location ? (
            <View style={styles.locationCard}>
              <MaterialCommunityIcons
                name="map-marker-check"
                size={48}
                color="#0066FF"
                style={styles.locationIcon}
              />
              <Text style={styles.locationText}>
                {location.city}, {location.country}
              </Text>
              <TouchableOpacity
                onPress={getLocation}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.refreshButton}
              >
                <Animated.View style={[styles.refreshButtonContent, animatedStyle]}>
                  <MaterialCommunityIcons
                    name="refresh"
                    size={24}
                    color="#0066FF"
                  />
                </Animated.View>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={getLocation}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              style={styles.getLocationButton}
            >
              <Animated.View style={[styles.getLocationContent, animatedStyle]}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={32}
                  color="#0066FF"
                />
                <Text style={styles.buttonText}>
                  Konumumu Bul
                </Text>
              </Animated.View>
            </TouchableOpacity>
          )
        ) : (
          <View style={styles.permissionCard}>
            <MaterialCommunityIcons
              name="map-marker-alert"
              size={48}
              color="#FF3B30"
              style={styles.permissionIcon}
            />
            <Text style={styles.permissionTitle}>
              Konum İzni Gerekli
            </Text>
            <Text style={styles.permissionText}>
              Yakınındaki kişileri görebilmek için konum iznine ihtiyacımız var
            </Text>
            <TouchableOpacity
              onPress={checkLocationPermission}
              style={styles.permissionButton}
            >
              <Text style={styles.permissionButtonText}>
                İzin Ver
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </RegisterStepLayout>
  );
}

const styles = StyleSheet.create({
  locationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationCard: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
    position: 'relative',
  },
  locationIcon: {
    marginBottom: SPACING.lg,
  },
  locationText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  refreshButton: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
  },
  refreshButtonContent: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  getLocationButton: {
    width: '100%',
  },
  getLocationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    padding: SPACING.xl,
    borderRadius: 16,
    gap: SPACING.md,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0066FF',
  },
  permissionCard: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  permissionIcon: {
    marginBottom: SPACING.lg,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  permissionButton: {
    backgroundColor: '#0066FF',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    borderRadius: 100,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 