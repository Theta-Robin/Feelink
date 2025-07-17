import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../services/supabase';
import CustomAlert from '../components/CustomAlert';

export default function AuthScreen({ navigation }: { navigation?: any }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      showAlert('Erreur', 'Merci de remplir tous les champs.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) showAlert('Erreur', error.message);
    else showAlert('Succès', 'Vérifie tes mails pour confirmer le compte. ( Il peux tombé dans vos spam)');
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      showAlert('Erreur', 'Merci de remplir tous les champs.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) showAlert('Erreur', error.message);
    else {
      if (navigation) navigation.replace('Home');
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <Text style={styles.title}>Bienvenue !</Text>
        <Text style={styles.subtitle}>Entre ton email et ton mot de passe pour te connecter ou t'inscrire</Text>

        <TextInput
          style={styles.input}
          placeholder="Ton adresse email"
          onChangeText={setEmail}
          value={email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
        <Text style={styles.helpText}>Ex : monadresse@email.com</Text>

        <TextInput
          style={styles.input}
          placeholder="Ton mot de passe (min. 6 caractères)"
          secureTextEntry
          onChangeText={setPassword}
          value={password}
          editable={!loading}
        />
        <Text style={styles.helpText}>Le mot de passe doit contenir au moins 6 caractères</Text>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Chargement...' : 'Se connecter'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buttonSecondary, loading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
        >
          <Text style={styles.buttonSecondaryText}>S'inscrire</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>

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
    flex: 1,
    backgroundColor: '#F8F9FB',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    fontSize: 18,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#CCC',
    color: '#222',
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 15,
    marginLeft: 5,
  },
  button: {
    backgroundColor: '#3478F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#A0BFF9',
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 18,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3478F6',
  },
  buttonSecondaryText: {
    color: '#3478F6',
    fontWeight: '700',
    fontSize: 18,
  },
});
