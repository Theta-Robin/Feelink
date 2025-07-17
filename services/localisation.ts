import { requestForegroundPermissionsAsync, getCurrentPositionAsync } from 'expo-location';
import { supabase } from './supabase';

export async function updateUserLocation() {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) {
    console.log('Utilisateur non connecté, impossible de mettre à jour la position');
    return;
  }

  const { status } = await requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    console.log('Permission géolocalisation refusée');
    return;
  }

  const location = await getCurrentPositionAsync({});
  const lat = location.coords.latitude;
  const lon = location.coords.longitude;

  const { error } = await supabase
    .from('profiles')
    .update({
      last_latitude: lat,
      last_longitude: lon,
      last_updated: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Erreur mise à jour position :', error);
  } else {
    console.log('Position utilisateur mise à jour:', lat, lon);
  }
}
