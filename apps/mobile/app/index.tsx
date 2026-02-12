// Minimal validation fixture — proves @toinoma/shared is consumable by Expo/Metro
// Full mobile implementation is Phase 6

import { Text, View, StyleSheet } from "react-native";
import type { Database } from "@toinoma/shared/types";
import { SUBJECTS } from "@toinoma/shared/constants";

// Type validation: this line would fail at compile time if shared types are broken
type _Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Toinoma</Text>
      <Text style={styles.subtitle}>
        {SUBJECTS.length} subjects available
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    color: "#737373",
  },
});
