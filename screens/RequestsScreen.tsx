import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../services/supabase';

type PartnerRequest = {
  id: string;
  sender_id: string;
  receiver_code: string;
  receiver_id?: string;
  status: string;
  created_at: string;
  sender_profile?: { name: string | null };
};

export default function RequestsScreen() {
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userCode, setUserCode] = useState<string | null>(null);

  const fetchUserInfo = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      console.log('Pas d’utilisateur connecté');
      return;
    }
    setUserId(authData.user.id);
    console.log('UserId:', authData.user.id);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('code_unique, partner_id')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.log('Erreur fetch profile:', profileError);
    }

    if (profile?.partner_id) setHasAccepted(true);
    setUserCode(profile?.code_unique);
    console.log('UserCode:', profile?.code_unique);
  };

  const fetchRequests = async () => {
    if (!userCode || !userId) {
      console.log('userCode ou userId non définis', userCode, userId);
      return;
    }

    console.log('fetchRequests avec userCode:', userCode, 'userId:', userId);

    const { data, error } = await supabase
      .from('partner_requests')
      .select('*, sender_profile:sender_id(name)')
      .or(`receiver_code.eq.${userCode},receiver_id.eq.${userId}`)
      .eq('status', 'pending');

    if (error) {
      console.log('Erreur fetchRequests:', error);
    }
    if (data) {
      console.log('Demandes reçues:', data);
      setRequests(data);
    }
    setLoading(false);
  };

  const acceptRequest = async (request: PartnerRequest) => {
    if (!userId) return;

    const { error: updateSelf } = await supabase
      .from('profiles')
      .update({ partner_id: request.sender_id })
      .eq('id', userId);

    const { error: updatePartner } = await supabase
      .from('profiles')
      .update({ partner_id: userId })
      .eq('id', request.sender_id);

    const { error: updateRequest } = await supabase
      .from('partner_requests')
      .update({ status: 'accepted' })
      .eq('id', request.id);

    if (updateSelf || updatePartner || updateRequest) {
      Alert.alert('Erreur', "Une erreur est survenue.");
    } else {
      Alert.alert('Succès ✅', 'Vous êtes désormais associés !');
      setHasAccepted(true);
      fetchRequests(); // rafraîchir la liste
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (userCode && userId) {
      fetchRequests();

      interval = setInterval(() => {
        fetchRequests();
      }, 30000); // Toutes les 30 secondes
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [userCode, userId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📥 Demandes reçues</Text>

      {requests.length === 0 ? (
        <Text style={styles.empty}>Aucune demande reçue.</Text>
      ) : (
        requests.map((req) => (
          <View key={req.id} style={styles.requestBox}>
            <Text style={styles.requestText}>
              {req.sender_profile?.name || 'Quelqu’un'} souhaite s’associer avec vous.
            </Text>
            <Button
              title="✅ Accepter"
              onPress={() => acceptRequest(req)}
              disabled={hasAccepted}
              color={hasAccepted ? 'gray' : 'green'}
            />
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  empty: {
    fontSize: 16,
    fontStyle: 'italic',
    color: 'gray',
  },
  requestBox: {
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  requestText: {
    fontSize: 16,
    marginBottom: 10,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
