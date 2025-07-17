import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  ToastAndroid,
  TextInput,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import CustomAlert from '../components/CustomAlert';

type Profile = {
  id: string;
  email: string;
  name: string | null;
  code_unique: string | null;
  mood: string | null;
  activity: string | null;
  partner_id: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
};

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [searchCode, setSearchCode] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [partnerName, setPartnerName] = useState<string | null>(null);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  async function generateUniqueCode(): Promise<string> {
    let code = '';
    let exists = true;

    while (exists) {
      code = Math.floor(10000000 + Math.random() * 90000000).toString();
      const { data } = await supabase
        .from('profiles')
        .select('code_unique')
        .eq('code_unique', code)
        .maybeSingle();
      exists = data !== null;
    }
    return code;
  }

  const fetchPartnerName = async (partnerId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', partnerId)
      .single();

    if (!error && data) {
      setPartnerName(data.name || 'Partenaire');
    }
  };

  const fetchProfile = async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      showAlert('Erreur', "Utilisateur non connecté.");
      return;
    }

    const userId = data.user.id;
    const userEmail = data.user.email;

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      showAlert('Erreur', profileError.message);
      return;
    }

    if (!profileData) {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({ id: userId, email: userEmail, name: null })
        .select()
        .single();

      if (insertError) {
        showAlert('Erreur', insertError.message);
        return;
      }

      setProfile(newProfile);
      return;
    }

    if (!profileData.code_unique) {
      const newCode = await generateUniqueCode();
      await supabase
        .from('profiles')
        .update({ code_unique: newCode })
        .eq('id', userId);

      fetchProfile();
      return;
    }

    setProfile(profileData);

    if (profileData.partner_id) {
      fetchPartnerName(profileData.partner_id);
    } else {
      setPartnerName(null);
    }
  };

  const copyToClipboard = () => {
    if (profile?.code_unique) {
      Clipboard.setString(profile.code_unique);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Code copié !', ToastAndroid.SHORT);
      } else {
        showAlert('Info', 'Code copié !');
      }
    }
  };

  const sendPartnerRequest = async () => {
    if (!searchCode || searchCode.length !== 8) {
      showAlert('Erreur', 'Veuillez entrer un code à 8 chiffres.');
      return;
    }

    setSendingRequest(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      showAlert('Erreur', "Utilisateur non connecté.");
      setSendingRequest(false);
      return;
    }

    const senderId = userData.user.id;

    const { data: receiverProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('code_unique', searchCode)
      .single();

    if (!receiverProfile) {
      showAlert('Erreur', "Aucun utilisateur trouvé avec ce code.");
      setSendingRequest(false);
      return;
    }

    const { error: insertError } = await supabase.from('partner_requests').insert([
      {
        sender_id: senderId,
        receiver_code: searchCode,
        receiver_id: receiverProfile.id,
        status: 'pending',
      },
    ]);

    setSendingRequest(false);

    if (insertError) {
      showAlert('Erreur', insertError.message);
    } else {
      showAlert('Demande envoyée ✅', 'La personne recevra votre demande.');
      setSearchCode('');
    }
  };

  const handleDissociate = async () => {
    if (!profile?.id || !profile?.partner_id) return;

    const { error: updateSelf } = await supabase
      .from('profiles')
      .update({ partner_id: null })
      .eq('id', profile.id);

    const { error: updatePartner } = await supabase
      .from('profiles')
      .update({ partner_id: null })
      .eq('id', profile.partner_id);

    if (updateSelf || updatePartner) {
      showAlert('Erreur', 'Impossible de se dissocier.');
    } else {
      showAlert('Séparé', 'Vous êtes maintenant dissociés.');
      fetchProfile();
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showAlert('Erreur', error.message);
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }], 
      });
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Mon Profil</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Nom</Text>
          <Text style={styles.value}>{profile.name || 'Pas défini'}</Text>

          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{profile.email}</Text>

          <Text style={styles.label}>Code unique</Text>
          <Text style={styles.code}>{profile.code_unique || 'En attente...'}</Text>

          <View style={styles.buttonContainer}>
            <Text onPress={copyToClipboard} style={[styles.button, { textAlign: 'center' }]}>
              Copier le code
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text
            onPress={() => navigation.navigate('EditProfile')}
            style={[styles.button, { textAlign: 'center' }]}
          >
            Modifier mon profil
          </Text>
        </View>

        {partnerName && (
          <View style={[styles.card, styles.partnerSection]}>
            <Text style={styles.label}>💞 Partenaire associé</Text>
            <Text style={styles.partnerName}>{partnerName}</Text>
            <View style={styles.dissociateButton}>
              <Text onPress={handleDissociate} style={styles.dissociateButtonText}>
                🚫 Se dissocier
              </Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>🔍 Rechercher un(e) partenaire</Text>
          <TextInput
            style={styles.input}
            placeholder="Code unique à 8 chiffres"
            value={searchCode}
            onChangeText={setSearchCode}
            keyboardType="numeric"
            maxLength={8}
          />
          <View style={[styles.buttonContainer, sendingRequest && styles.buttonDisabled]}>
            <Text
              onPress={sendPartnerRequest}
              style={[styles.button, sendingRequest && { backgroundColor: '#A0BFF9' }]}
            >
              {sendingRequest ? 'Envoi en cours...' : 'Envoyer une demande'}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text
            onPress={handleLogout}
            style={[styles.button, { textAlign: 'center', backgroundColor: '#999' }]}
          >
            🚪 Se déconnecter
          </Text>
        </View>
      </ScrollView>

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
    backgroundColor: '#F8F9FB',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 25,
    color: '#333',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  label: {
    fontWeight: '600',
    fontSize: 16,
    color: '#666',
    marginBottom: 6,
  },
  value: {
    fontSize: 20,
    color: '#222',
    marginBottom: 12,
  },
  code: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3478F6',
    marginBottom: 12,
    letterSpacing: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#B0B0B0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    color: '#222',
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  buttonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  button: {
    backgroundColor: '#3478F6',
    paddingVertical: 14,
    borderRadius: 12,
    color: 'white',
    fontWeight: '700',
    fontSize: 18,
  },
  buttonDisabled: {
    backgroundColor: '#A0BFF9',
  },
  partnerSection: {
    marginTop: 10,
  },
  partnerName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#444',
    marginBottom: 12,
  },
  dissociateButton: {
    backgroundColor: '#FF5A5F',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  dissociateButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
});
