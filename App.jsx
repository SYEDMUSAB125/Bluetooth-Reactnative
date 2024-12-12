import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Modal,
    FlatList,
    ActivityIndicator,
    Alert,
    TextInput,
    ScrollView,
} from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

const Home = () => {
    const [currentDateTime, setCurrentDateTime] = useState(new Date());
    const [devices, setDevices] = useState([]);
    const [connectedDevice, setConnectedDevice] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [receivedData, setReceivedData] = useState('');

    // Update date and time every second
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentDateTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Enable Bluetooth if it's off
    const enableBluetooth = async () => {
        try {
            const isEnabled = await RNBluetoothClassic.isBluetoothEnabled();
            if (!isEnabled) {
                Alert.alert(
                    'Bluetooth Disabled',
                    'Bluetooth is off. Would you like to enable it?',
                    [
                        { text: 'No', style: 'cancel' },
                        { text: 'Yes', onPress: () => RNBluetoothClassic.enable() },
                    ]
                );
            }
        } catch (error) {
            console.error('Error enabling Bluetooth:', error);
        }
    };

    // Discover Bluetooth devices
    const discoverDevices = async () => {
        try {
            setIsLoading(true);
            const availableDevices = await RNBluetoothClassic.startDiscovery();
            console.log('Discovered devices:', availableDevices);
            setDevices(availableDevices);
        } catch (error) {
            console.error('Error discovering devices:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Open the modal and start discovering devices
    const handleDiscoverDevices = async () => {
        await enableBluetooth();
        setModalVisible(true);
        discoverDevices();
    };

    // Start listening for data from the connected device
    const startListeningForData = (device) => {
        try {
            const subscription = device.onDataReceived((data) => {
                console.log('Received data:', atob(data.data));
                setReceivedData(atob(data.data));
            });
            return () => subscription.remove();
        } catch (error) {
            console.error('Error starting data listener:', error);
        }
    };

    // Connect to a selected device
    const connectToDevice = async (device) => {
        try {
            console.log(`Attempting to connect to device: ${device.name} (${device.address})`);
            const connected = await device.connect({
                connectionType: 'binary',
         } );
            if (connected) {
                console.log(`Successfully connected to: ${device.name} (${device.address})`);
                setConnectedDevice(device);
                Alert.alert('Connected', `Successfully connected to ${device.name}`);
                setModalVisible(false);
                startListeningForData(device);
            }
        } catch (error) {
            console.error('Error connecting to device:', error);

            if (error.message.includes('ConnectionFailedException')) {
                Alert.alert(
                    'Connection Failed',
                    `Could not connect to ${device.name} (${device.address}). Pairing might have been rejected.`
                );
            } else {
                Alert.alert('Error', `An error occurred while connecting to ${device.name}.`);
            }

            console.log(`Failed to connect to device: ${device.name} (${device.address})`);
        }
    };

    // Disconnect from the current device
    const disconnectDevice = async () => {
        try {
            if (connectedDevice) {
                await connectedDevice.disconnect();
                Alert.alert('Disconnected', `Successfully disconnected from ${connectedDevice.name}`);
                setConnectedDevice(null);
                setReceivedData('');
            }
        } catch (error) {
            console.error('Error disconnecting from device:', error);
        }
    };

    // Read data from the connected device
    const readDataFromDevice = async () => {
        try {
            if (!connectedDevice) {
                Alert.alert('No Device Connected', 'Please connect to a device first.');
                return;
            }
            const data = await connectedDevice.read();
            console.log('Read data:', data);
            setReceivedData((prevData) => prevData + '\n' + data);
            Alert.alert('Data Received', `Data: ${data}`);
        } catch (error) {
            console.error('Error reading data:', error);
            Alert.alert('Error', 'Failed to read data from the device.');
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>Bluetooth Device Manager</Text>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.BlueButton} onPress={handleDiscoverDevices}>
                    <Text style={styles.saveButtonText}>Discover Devices</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.BlueButton} onPress={disconnectDevice}>
                    <Text style={styles.saveButtonText}>Disconnect</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.btn}>
                <Text style={styles.btnText}>
                    {connectedDevice
                        ? `Connected: ${connectedDevice.name || 'Unknown Device'}`
                        : 'Not Connected'}
                </Text>
            </TouchableOpacity>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.BlueButton} onPress={readDataFromDevice}>
                    <Text style={styles.saveButtonText}>Read Data</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <Text style={styles.label}>Received Data:</Text>
                <TextInput
                    style={styles.textArea}
                    multiline
                    value={receivedData}
                    editable={false}
                />
            </View>

            <View style={styles.content}>
                <Text style={styles.label}>Date: {currentDateTime.toLocaleDateString()}</Text>
                <Text style={styles.label}>Time: {currentDateTime.toLocaleTimeString()}</Text>
            </View>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Available Devices</Text>
                        {isLoading ? (
                            <ActivityIndicator size="large" color="#005f56" />
                        ) : (
                            <FlatList
                                data={devices}
                                keyExtractor={(item) => item.address}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.deviceItem}
                                        onPress={() => connectToDevice(item)}
                                    >
                                        <Text style={styles.deviceText}>
                                            {item.name || 'Unknown Device'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

export default Home;


const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        alignItems: 'center',
        backgroundColor: '#f3f8fc',
        paddingBottom: 20,
    },
    header: {
        padding: 15,
        backgroundColor: '#005f56',
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    headerText: {
        fontSize: 26,
        color: '#fff',
        fontWeight: 'bold',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginVertical: 20,
    },
    BlueButton: {
        padding: 15,
        backgroundColor: '#005f56',
        borderRadius: 30,
        width: '40%',
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    btn: {
        marginTop: 20,
        padding: 15,
        backgroundColor: '#fff',
        borderRadius: 30,
        width: '90%',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#005f56',
    },
    btnText: {
        color: '#005f56',
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        marginVertical: 10,
        padding: 20,
        backgroundColor: '#ffffff',
        borderRadius: 15,
        width: '90%',
        alignItems: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    label: {
        fontSize: 18,
        marginVertical: 5,
        color: '#005f56',
    },
    textArea: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        fontSize: 16,
        width: '100%',
        height: 150,
        backgroundColor: '#f9f9f9',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 15,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    deviceItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    deviceText: {
        fontSize: 16,
    },
    closeButton: {
        marginTop: 15,
        padding: 10,
        backgroundColor: '#005f56',
        borderRadius: 10,
        alignItems: 'center',
        width: '50%',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
    },
});