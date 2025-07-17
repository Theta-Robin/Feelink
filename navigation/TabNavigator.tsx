import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import RequestsScreen from '../screens/RequestsScreen';
import ActivityMoodScreen from '../screens/ActivityMoodScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    </Stack.Navigator>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
        tabBarActiveTintColor: '#3478F6',
        tabBarInactiveTintColor: '#999',
        tabBarIcon: ({ focused, color, size }) => {
          type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
          let iconName: IoniconName = 'home'; // valeur par défaut

          if (route.name === 'Accueil') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Profil') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Demandesss') {
            iconName = focused ? 'mail' : 'mail-outline';
          } else if (route.name === 'Humeur') {
            iconName = focused ? 'happy' : 'happy-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Accueil"
        component={HomeScreen}
        options={{ tabBarLabel: 'Accueil' }}
      />
      <Tab.Screen
        name="Profil"
        component={ProfileStack}
        options={{ tabBarLabel: 'Profil' }}
      />
      <Tab.Screen
        name="Demandesss"
        component={RequestsScreen}
        options={{ tabBarLabel: 'Demandes' }}
      />
      <Tab.Screen
        name="Humeur"
        component={ActivityMoodScreen}
        options={{ tabBarLabel: 'Humeur' }}
      />
    </Tab.Navigator>
  );
}
