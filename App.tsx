import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

import TabNavigator from './navigation/TabNavigator';
import AuthScreen from './screens/AuthScreen';
import { supabase } from './services/supabase';
import { Session } from '@supabase/supabase-js';
import Loader from './components/Loader';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Récupérer la session au démarrage
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      const currentSession = data.session ?? null;
      setSession(currentSession);
      setLoading(false);

      if (currentSession) {
        await registerForPushNotificationsAsync(currentSession.user.id);
      }
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session) {
          await registerForPushNotificationsAsync(session.user.id);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) return <Loader />;

  return (
    <NavigationContainer>
      {session ? <TabNavigator /> : <AuthScreen />}
    </NavigationContainer>
  );
}

async function registerForPushNotificationsAsync(userId: string) {
  try {
    if (!Device.isDevice) {
      console.warn('Notifications push seulement sur un vrai appareil');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Permission de notifications refusée');
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    // Enregistre le token dans Supabase
    await supabase
      .from('profiles')
      .update({ expo_push_token: token })
      .eq('id', userId);
  } catch (err) {
    console.error('Erreur en enregistrant le token push :', err);
  }
}
