# Native Production Fixes — Design Spec

**Date:** 2026-05-22  
**Context:** App đã build bằng EAS managed workflow (Expo ~56), chạy trên Android native thật. Cần sửa các phần code tạm / không đúng cách trên native trước khi release bản cuối.

---

## Scope

7 fix chia thành 3 nhóm: Push Notifications, GPS & Background Location, Clean up nhỏ.

---

## Section 1 — Push Notifications

### Fix 1: Thêm `setNotificationHandler` ở module scope

**File:** `app/app/_layout.tsx`

Thêm ở module scope (ngoài mọi component), ngay sau các import:

```ts
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});
```

Không có handler này, notification bị nuốt lặng khi app đang foreground.

### Fix 2: Đổi dynamic import SecureStore → static import

**File:** `app/app/_layout.tsx`

Xóa dòng dynamic import bên trong `initQuote()`:
```ts
// XÓA:
const { default: SecureStore } = await import("expo-secure-store");
```

Thêm static import ở đầu file:
```ts
import * as SecureStore from "expo-secure-store";
```

Dùng `SecureStore.getItemAsync("PERSONA_MODE")` trực tiếp như trước.

---

## Section 2 — GPS & Background Location

### Fix 3: MapView error handler thật sự

**File:** `app/app/(tabs)/gps.tsx`

Thêm `onError` vào `<MapView>`:
```tsx
onError={() => setMapError(true)}
```

Thêm fallback UI sau MapView block:
```tsx
{location && mapError && (
  <View style={{ height: 200, margin: 16, borderRadius: 12,
    backgroundColor: "#111", alignItems: "center", justifyContent: "center" }}>
    <Text style={{ color: "#555", fontSize: 13 }}>Không tải được bản đồ</Text>
  </View>
)}
```

### Fix 4: `restartLocationIfNeeded()` + gọi khi app init

**File:** `app/lib/location.ts` — thêm hàm mới:

```ts
export async function restartLocationIfNeeded(): Promise<void> {
  const enabled = await isLocationEnabled();
  if (!enabled) return;

  const isRunning = await Location.hasStartedLocationUpdatesAsync(TASK_NAME).catch(() => false);
  if (isRunning) return;

  await Location.startLocationUpdatesAsync(TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 15 * 60 * 1000,
    distanceInterval: 200,
    deferredUpdatesInterval: 15 * 60 * 1000,
    showsBackgroundLocationIndicator: false,
    foregroundService: {
      notificationTitle: "Bạn của Kem",
      notificationBody: "Đang cập nhật vị trí",
    },
  });
}
```

**File:** `app/app/_layout.tsx` — thêm vào `AppShell`:
```ts
import { restartLocationIfNeeded } from "@/lib/location";

useEffect(() => {
  restartLocationIfNeeded();
}, []);
```

Gọi một lần khi app mount. Nếu user đã bật location nhưng task bị kill sau reboot, hàm này restart lại task.

### Fix 5: Permissions explicit trong `app.json`

**File:** `app/app.json`

Thêm vào `android.permissions`:
```json
"ACCESS_FINE_LOCATION",
"ACCESS_COARSE_LOCATION",
"ACCESS_BACKGROUND_LOCATION",
"FOREGROUND_SERVICE",
"FOREGROUND_SERVICE_LOCATION"
```

Expo-location plugin với `isAndroidBackgroundLocationEnabled: true` đã inject các permissions này, nhưng khai báo tường minh tránh rủi ro khi EAS thay đổi plugin behavior.

### Fix 6: Thêm `expo-sensors` vào plugins

**File:** `app/app.json`

Thêm `"expo-sensors"` vào mảng `plugins`. `lib/shake.ts` dùng Accelerometer từ package này.

---

## Section 3 — Clean up nhỏ

### Fix 7: Xóa `timeInterval` thừa trong foreground GPS fetch

**File:** `app/app/(tabs)/gps.tsx`

```ts
// Trước:
pos = await Location.getCurrentPositionAsync({
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 15000,
});

// Sau:
pos = await Location.getCurrentPositionAsync({
  accuracy: Location.Accuracy.Balanced,
});
```

`timeInterval` không có tác dụng với one-shot `getCurrentPositionAsync`.

---

## File thay đổi tổng hợp

| Fix | File | Loại thay đổi |
|-----|------|---------------|
| 1 | `app/app/_layout.tsx` | Thêm `setNotificationHandler` module scope |
| 2 | `app/app/_layout.tsx` | Đổi dynamic → static import SecureStore |
| 3 | `app/app/(tabs)/gps.tsx` | Thêm `onError` + fallback UI MapView |
| 4 | `app/lib/location.ts` | Thêm `restartLocationIfNeeded()` |
| 4 | `app/app/_layout.tsx` | Gọi `restartLocationIfNeeded()` khi init |
| 5 | `app/app.json` | Thêm location/foreground permissions |
| 6 | `app/app.json` | Thêm `expo-sensors` plugin |
| 7 | `app/app/(tabs)/gps.tsx` | Xóa `timeInterval` thừa |

---

## Không trong scope

- Thay đổi backend
- Thay đổi UI/UX
- Thêm feature mới
- Migrate sang FCM token trực tiếp (Expo Push Token đủ dùng với EAS)
