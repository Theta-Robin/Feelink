import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { supabase } from '../services/supabase';
import CustomAlert from '../components/CustomAlert';

const MOODS = [
  { emoji: '😀', label: 'Content' },
  { emoji: '😢', label: 'Triste' },
  { emoji: '😡', label: 'En colère' },
  { emoji: '❤️', label: 'Amoureux' },
  { emoji: '😊', label: 'Heureux' },
  { emoji: '😴', label: 'Fatigué' },
  { emoji: '🤔', label: 'Pensif' },
  { emoji: '😎', label: 'Confiant' },
  { emoji: '😱', label: 'Stressé' },
  { emoji: '🤒', label: 'Malade' },
  { emoji: '😍', label: 'Excité' },
  { emoji: '😞', label: 'Déçu' },
  { emoji: '🤗', label: 'Serein' },
  { emoji: '🥳', label: 'Fêtard' },
  { emoji: '😐', label: 'Neutre' },
];

export default function ActivityMoodScreen() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [activity, setActivity] = useState('');
  const [loading, setLoading] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) {
        showAlert('Erreur', 'Utilisateur non connecté');
        setLoading(false);
        return;
      }
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('mood, activity')
        .eq('id', userId)
        .single();
      if (error) {
        showAlert('Erreur', 'Impossible de charger le profil');
      } else {
        setSelectedMood(profile?.mood || null);
        setActivity(profile?.activity || '');
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const saveProfile = async () => {
    if (!selectedMood) {
      showAlert('Attention', 'Veuillez sélectionner une humeur.');
      return;
    }
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) {
      showAlert('Erreur', 'Utilisateur non connecté');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ mood: selectedMood, activity: activity.trim() })
      .eq('id', userId);

    if (updateError) {
      showAlert('Erreur', 'Impossible de sauvegarder les données');
      setLoading(false);
      return;
    }

    // 🔍 Récupérer le partenaire
    const { data: profile, error: partnerError } = await supabase
      .from('profiles')
      .select('partner_id')
      .eq('id', userId)
      .single();

    const partnerId = profile?.partner_id;

    if (partnerId && !partnerError) {
      // 🔔 Créer une notification pour le partenaire
      await supabase.from('notifications').insert({
        sender_id: userId,
        receiver_id: partnerId,
        type: 'profile_update',
        message: 'Votre partenaire a mis à jour son humeur ou son activité !',
      });
    }

    showAlert('Succès', 'Humeur et activité mises à jour');
    setLoading(false);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 60}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Choisissez votre humeur</Text>
          <View style={styles.moodsContainer}>
            {MOODS.map(({ emoji, label }) => (
              <TouchableOpacity
                key={label}
                style={[
                  styles.moodButton,
                  selectedMood === label && styles.moodButtonSelected,
                ]}
                onPress={() => setSelectedMood(label)}
                activeOpacity={0.7}
              >
                <Text style={styles.moodEmoji}>{emoji}</Text>
                <Text style={styles.moodLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.title}>Votre activité actuelle</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex : Travail, Lecture, Sport..."
            value={activity}
            onChangeText={setActivity}
            editable={!loading}
            returnKeyType="done"
          />

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={saveProfile}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'En cours...' : 'Sauvegarder'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <CustomAlert
          visible={alertVisible}
          title={alertTitle}
          message={alertMessage}
          onClose={() => setAlertVisible(false)}
        />
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  moodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 30,
  },
  moodButton: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    margin: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  moodButtonSelected: {
    borderColor: '#FF69B4',
    backgroundColor: '#ffe6f0',
  },
  moodEmoji: {
    fontSize: 28,
  },
  moodLabel: {
    marginTop: 6,
    fontSize: 12,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 45,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 25,
  },
  saveButton: {
    backgroundColor: '#FF69B4',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  saveButtonDisabled: {
    backgroundColor: '#ffa6cc',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 18,
  },
});
