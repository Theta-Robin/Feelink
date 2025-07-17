import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { supabase } from '../services/supabase';
import { updateUserLocation } from '../services/localisation';
import { requestForegroundPermissionsAsync, getCurrentPositionAsync } from 'expo-location';

type Profile = {
  id: string;
  name: string | null;
  mood: string | null;
  activity: string | null;
  theme_color: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
};

const toRad = (x: number) => (x * Math.PI) / 180;

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // mètres
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getDirection = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const λ1 = toRad(lon1);
  const λ2 = toRad(lon2);

  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  const degrees = (brng + 360) % 360;

  const directions = ['↑ N', '↗ NE', '→ E', '↘ SE', '↓ S', '↙ SW', '← W', '↖ NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};

// Saison en fonction de la date
const getCurrentSeason = (date = new Date()): 'printemps' | 'été' | 'automne' | 'hiver' => {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if ((month === 3 && day >= 20) || (month > 3 && month < 6) || (month === 6 && day < 21)) {
    return 'printemps';
  } else if ((month === 6 && day >= 21) || (month > 6 && month < 9) || (month === 9 && day < 23)) {
    return 'été';
  } else if ((month === 9 && day >= 23) || (month > 9 && month < 12) || (month === 12 && day < 21)) {
    return 'automne';
  } else {
    return 'hiver';
  }
};

// Date de Pâques 
const getEasterDate = (year: number): Date => {
  const f = Math.floor;
  const G = year % 19;
  const C = f(year / 100);
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - f(H / 28) * (1 - f(H / 28) * f(29 / (H + 1)) * f((21 - G) / 11));
  const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;
  const L = I - J;
  const month = 3 + f((L + 40) / 44);
  const day = L + 28 - 31 * f(month / 4);
  return new Date(year, month - 1, day);
};

// Vérification événement spécial 
const isSpecialDate = (date: Date): 'saint-valentin' | 'paques' | null => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (month === 2 && day === 14) return 'saint-valentin';
  const easter = getEasterDate(year);
  if (easter.getDate() === day && (easter.getMonth() + 1) === month) return 'paques';

  return null;
};

const themeStyles = {
  printemps: {
    container: { backgroundColor: '#D4F1BE' },
    text: { color: '#3C763D', fontFamily: 'Cochin' },
    extraElement: <Text style={{ fontSize: 50 }}>🌸</Text>,
  },
  été: {
    container: { backgroundColor: '#87CEEB' },
    text: { color: '#004080', fontFamily: 'Arial' },
    extraElement: <Text style={{ fontSize: 50 }}>🏖️</Text>,
  },
  automne: {
    container: { backgroundColor: '#F4A460' },
    text: { color: '#8B4513', fontFamily: 'Georgia' },
    extraElement: <Text style={{ fontSize: 50 }}>🍂</Text>,
  },
  hiver: {
    container: { backgroundColor: '#D6EAF8' },
    text: { color: '#154360', fontFamily: 'Courier New' },
    extraElement: <Text style={{ fontSize: 50 }}>❄️</Text>,
  },
  'saint-valentin': {
    container: { backgroundColor: '#FFC0CB' },
    text: { color: '#900C3F', fontFamily: 'Comic Sans MS' },
    extraElement: <Text style={{ fontSize: 50 }}>❤️❤️❤️</Text>,
  },
  paques: {
    container: { backgroundColor: '#FFFACD' },
    text: { color: '#6B8E23', fontFamily: 'Papyrus' },
    extraElement: <Text style={{ fontSize: 50 }}>🥚🐣</Text>,
  },
};

export default function HomeScreen() {
  const [partner, setPartner] = useState<Profile | null>(null);
  const [distance, setDistance] = useState<string>('...');
  const [direction, setDirection] = useState<string>('...');
  const [loading, setLoading] = useState(true);
  const [color, setColor] = useState<string>('#FF69B4');

  const now = new Date();
  const specialEvent = isSpecialDate(now);
  const season = getCurrentSeason(now);
  const theme = specialEvent || season;
  const stylesForTheme = themeStyles[theme] || themeStyles['été'];

  const fetchPartnerData = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('partner_id')
      .eq('id', userId)
      .single();

    if (userError) {
      setLoading(false);
      return;
    }

    const partnerId = userProfile?.partner_id;
    if (!partnerId) {
      setLoading(false);
      return;
    }

    const { data: partnerProfile, error: partnerError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', partnerId)
      .single();

    if (partnerError || !partnerProfile) {
      setLoading(false);
      return;
    }

    setPartner(partnerProfile);
    setColor(partnerProfile.theme_color || '#FF69B4');

    let userLat = null;
    let userLon = null;
    try {
      const userLocation = await getCurrentPositionAsync({});
      userLat = userLocation.coords.latitude;
      userLon = userLocation.coords.longitude;
    } catch {
      setDistance('Position indisponible');
      setDirection('N/A');
      setLoading(false);
      return;
    }

    if (!partnerProfile.last_latitude || !partnerProfile.last_longitude) {
      setDistance('N/A');
      setDirection('N/A');
      setLoading(false);
      return;
    }

    const theirLat = partnerProfile.last_latitude;
    const theirLon = partnerProfile.last_longitude;

    const dist = haversineDistance(userLat, userLon, theirLat, theirLon);
    setDistance(dist < 1000 ? `${dist.toFixed(0)} m` : `${(dist / 1000).toFixed(2)} km`);

    const dir = getDirection(userLat, userLon, theirLat, theirLon);
    setDirection(dir);

    setLoading(false);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const init = async () => {
      try {
        const { status } = await requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setDistance('Permission refusée');
          setLoading(false);
          return;
        }

        await Promise.all([updateUserLocation(), fetchPartnerData()]);

        interval = setInterval(() => {
          updateUserLocation();
          fetchPartnerData();
        }, 30000);
      } catch {
        setLoading(false);
      }
    };

    init();

    return () => {
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <View style={[styles.centered, stylesForTheme.container]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={[{ marginTop: 10 }, stylesForTheme.text]}>Chargement des données...</Text>
      </View>
    );
  }

  if (!partner) {
    return (
      <View style={[styles.centered, stylesForTheme.container]}>
        <Text style={stylesForTheme.text}>Aucun partenaire associé.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.themeContainer, stylesForTheme.container]}>
        {stylesForTheme.extraElement}
        <Text style={[styles.heart, stylesForTheme.text]}>❤️</Text>
        <Text style={[styles.name, stylesForTheme.text]}>{partner.name || 'Partenaire'}</Text>
        <Text style={[styles.info, stylesForTheme.text]}>📍 Distance : {distance}</Text>
        <Text style={[styles.info, stylesForTheme.text]}>🧭 Direction : {direction}</Text>
        <Text style={[styles.info, stylesForTheme.text]}>🎯 Activité : {partner.activity || 'Non précisée'}</Text>
        <Text style={[styles.info, stylesForTheme.text]}>😊 Humeur : {partner.mood || 'Non précisée'}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
  },
  themeContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heart: {
    fontSize: 60,
    marginBottom: 10,
  },
  name: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  info: {
    fontSize: 18,
    marginBottom: 10,
  },
});
