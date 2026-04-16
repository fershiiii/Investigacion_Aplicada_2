import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Button,
  StyleSheet,
  Text,
  Animated,
  PanResponder,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { DeviceMotion } from "expo-sensors";

const IP = "http://192.168.0.12:3000/sensor";

export default function App() {
  const [data, setData] = useState({});
  const [permission, requestPermission] = useCameraPermissions();

  // 🎮 ORIENTACIÓN REAL
  const motion = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // ✋ DRAG
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // 🧠 REFERENCIA INICIAL
  const initialRotation = useRef({ beta: 0, gamma: 0 });

  // 🔀 COMBINACIÓN FINAL
  const combinedX = Animated.add(motion.x, pan.x);
  const combinedY = Animated.add(motion.y, pan.y);

  // 📡 API
  const fetchData = async () => {
    try {
      const res = await fetch(IP);
      const dat = await res.json();
      setData(dat);
    } catch (error) {
      console.log("Error:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // 🎮 DEVICE MOTION (ANCLADO REAL)
  useEffect(() => {
    DeviceMotion.setUpdateInterval(50);

    let first = true;

    const sub = DeviceMotion.addListener((data) => {
      const { beta, gamma } = data.rotation;

      if (first) {
        initialRotation.current = { beta, gamma };
        first = false;
      }

      const dx = gamma - initialRotation.current.gamma;
      const dy = beta - initialRotation.current.beta;

      motion.setValue({
        x: dx * 300,
        y: dy * 300,
      });
    });

    return () => sub.remove();
  }, []);

  // ✋ DRAG
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),

      onPanResponderRelease: () => {
        pan.extractOffset();
      },
    }),
  ).current;

  // 🔄 BOTÓN
  const handleUpdate = async () => {
    const newData = {
      temperature: Number((Math.random() * 30 + 10).toFixed(1)),
      humidity: Math.floor(Math.random() * 60) + 30,
      status: ["OK", "WARNING", "ERROR"][Math.floor(Math.random() * 3)],
    };

    try {
      await fetch(IP, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newData),
      });

      fetchData();
    } catch (error) {
      console.log(error);
    }
  };

  const getStatusColor = () => {
    if (data.status === "OK") return "#00FFAA";
    if (data.status === "WARNING") return "#FFD700";
    if (data.status === "ERROR") return "#FF4444";
    return "#FFFFFF";
  };

  // 📸 permisos
  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "white" }}>Permitir cámara</Text>
        <Button title="Permitir" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* 📸 Cámara */}
      <CameraView style={StyleSheet.absoluteFillObject} />

      {/* 📊 PANEL AR */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.panel,
          {
            transform: [{ translateX: combinedX }, { translateY: combinedY }],
          },
        ]}
      >
        <Text style={styles.title}>SENSOR IoT</Text>

        <Text style={styles.text}>
          🌡Temperatura: {data.temperature || "--"} °C
        </Text>

        <Text style={styles.text}>💧Humedad: {data.humidity || "--"} %</Text>

        <Text style={[styles.text, { color: getStatusColor() }]}>
          ● {data.status || "---"}
        </Text>

        <Text style={styles.text}>📍Ubicación: San Salvador</Text>
      </Animated.View>

      {/* 🔘 BOTÓN */}
      <View style={styles.button}>
        <Button title="Actualizar" onPress={handleUpdate} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    top: "40%",
    left: "20%",
    width: 230,
    padding: 15,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderWidth: 1,
    borderColor: "#00FFAA",
  },
  title: {
    color: "#00FFAA",
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "bold",
  },
  text: {
    color: "white",
    textAlign: "center",
    marginBottom: 5,
  },
  button: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 2,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
