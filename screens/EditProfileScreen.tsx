import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView } from 'react-native';
import { supabase } from '../services/supabase';

export default function EditProfileScreen({ navigation }: { navigation: any }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        Alert.alert('Erreur', 'Utilisateur non connecté');
        return;
      }
      const userId = data.user.id;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .single();

      if (profileError) {
        Alert.alert('Erreur', profileError.message);
        return;
      }

      setName(profileData?.name ?? '');
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      Alert.alert('Erreur', 'Utilisateur non connecté');
      setLoading(false);
      return;
    }
    const userId = data.user.id;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ name })
      .eq('id', userId);

    setLoading(false);

    if (updateError) {
      Alert.alert('Erreur', updateError.message);
      return;
    }

    Alert.alert('Succès', 'Profil mis à jour', [
      {
        text: 'OK',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Nom :</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Entrez votre nom"
      />

      <View style={{ marginTop: 20 }}>
        <Button title={loading ? 'Enregistrement...' : 'Enregistrer'} onPress={handleSave} disabled={loading} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
  },
  label: {
    fontWeight: '600',
    marginBottom: 8,
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 6,
    fontSize: 16,
  },
});
