import { Feather } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { colors, fonts } from "../theme";
import AlertsScreen from "../screens/AlertsScreen";
import AnalysisScreen from "../screens/AnalysisScreen";
import DashboardScreen from "../screens/DashboardScreen";
import HistoryScreen from "../screens/HistoryScreen";
import InboxScreen from "../screens/InboxScreen";
import LandingScreen from "../screens/LandingScreen";
import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const tabConfig = {
  Overview: {
    component: DashboardScreen,
    icon: "grid",
  },
  Analyze: {
    component: AnalysisScreen,
    icon: "activity",
  },
  Inbox: {
    component: InboxScreen,
    icon: "mail",
  },
  History: {
    component: HistoryScreen,
    icon: "clock",
  },
  Alerts: {
    component: AlertsScreen,
    icon: "bell",
  },
};

function WorkspaceTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Overview"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accentBlue,
        tabBarInactiveTintColor: colors.textSoft,
        tabBarStyle: {
          position: "absolute",
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: "rgba(10, 10, 14, 0.96)",
          height: Platform.select({ ios: 82, android: 72 }),
          paddingTop: 8,
          paddingBottom: Platform.select({ ios: 18, android: 10 }),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: fonts.sansMedium,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        },
        tabBarIcon: ({ color, size, focused }) => (
          <Feather
            name={tabConfig[route.name].icon}
            size={size - 1}
            color={focused ? colors.accentBlue : color}
          />
        ),
      })}
    >
      {Object.entries(tabConfig).map(([name, config]) => (
        <Tab.Screen key={name} name={name} component={config.component} />
      ))}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={colors.accentBlue} />
      </View>
    );
  }

  return (
    <RootStack.Navigator
      key={isAuthenticated ? "workspace" : "public"}
      initialRouteName={isAuthenticated ? "Workspace" : "Landing"}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {isAuthenticated ? (
        <RootStack.Screen name="Workspace" component={WorkspaceTabs} />
      ) : (
        <>
          <RootStack.Screen name="Landing" component={LandingScreen} />
          <RootStack.Screen name="Login" component={LoginScreen} />
          <RootStack.Screen name="Signup" component={SignupScreen} />
        </>
      )}
    </RootStack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
