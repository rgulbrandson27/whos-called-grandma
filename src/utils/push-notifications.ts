import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { setPushToken } from "@/data/members";

// Best-effort: notification permission can be denied, a simulator has no
// push capability, etc. None of that should ever block onboarding — the
// "hasn't checked in" alert just won't reach a device that couldn't register.
export async function registerForPushNotifications(memberId: string): Promise<void> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) {
      permission = await Notifications.requestPermissionsAsync();
    }
    if (!permission.granted) return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await setPushToken(memberId, token);
  } catch {
    // Push is a nice-to-have here, not something worth surfacing an error for.
  }
}
