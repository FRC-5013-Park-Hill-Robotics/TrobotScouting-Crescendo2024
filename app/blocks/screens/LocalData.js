// Library imports
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getStorage } from 'firebase/storage';
import * as React from 'react';
import { ScrollView, Text, View } from 'react-native';


// Component Imports
import { initializeFirebaseFromSettings, uploadMultipleStringsToCloud } from '../../common/CloudStorage';
import { ColorScheme as CS } from '../../common/ColorScheme';
import { fU, vh, vw } from '../../common/Constants';
import { globalButtonStyles, globalContainerStyles, globalTextStyles } from '../../common/GlobalStyleSheet';
import { deleteData, deleteMultipleDataKeys, loadMatchData, loadPitData, loadSettings, readMultipleDataKeys, removeNonMatchKeys } from '../../common/LocalStorage';
import { TTButton } from '../components/ButtonComponents';
import { TTAlert, TTConfirmation, TTGradient, TTLoading, TTWarning } from '../components/ExtraComponents';

const fileDir = FileSystem.documentDirectory;

// Main function
const LocalData = ({route, navigation}) => {
	// FILLS LOCAL DATA WITH A BUNCH OF FAKE DATA FOR TESTING
	const [matchKeys, setMatchKeys] = React.useState([]);
	const [settings, setSettings] = React.useState(null);

	// Confirmation states
    const [confirmationVisible, setConfirmationVisible] = React.useState(false);
    const [confirmationContent, setConfirmationContent] = React.useState([]);

	// Loading states
    const [loadingVisible, setLoadingVisible] = React.useState(false);
    const [loadingContent, setLoadingContent] = React.useState([]);

	// Warning states
    const [warningVisible, setWarningVisible] = React.useState(false);
    const [warningContent, setWarningContent] = React.useState([]); // Title, text, button text

    // Alert states
    const [alertVisible, setAlertVisible] = React.useState(false);
    const [alertContent, setAlertContent] = React.useState([]);

    // Gets all the keys from local settings
	const loadKeys = async () => {
        try {
		    const loadedKeys = await AsyncStorage.getAllKeys()
            const filteredLoadedKeys = removeNonMatchKeys(loadedKeys);
			setMatchKeys(filteredLoadedKeys);
        } catch (e) {
            console.error(e);
        }
	};

    // Upload all the data keys to the cloud
    const uploadDataToCloud = async () => {
		setLoadingContent([null, `Uploading files to cloud...`]);
		setLoadingVisible(true);

		let storage = null;
		try {
			storage = getStorage();
		} catch (e) {
			setLoadingVisible(false);
			setWarningContent([null, `Couldn't get a connection to bucket storage! Make sure you've scanned a valid QR code.`, null]);
			setWarningVisible(true);
			return;
		}

		let multiStringData = [];
		try {
			multiStringData = await readMultipleDataKeys(matchKeys);
		} catch (e) {
			setLoadingVisible(false);
			setWarningContent([null, `Couldn't get a connection to bucket storage!\n${e}`, null]);
			setWarningVisible(true);
			return;
		}
		const filenames = matchKeys.map(
			(keyName) => {
				const components = keyName.split("-");
				const teamNumberPadded = components[0].slice(3).padStart(4, "0");
				let filename = `${teamNumberPadded}-${components.slice(1).join("-")}.txt`;

				if (settings !== null) filename = `${settings.subpath}/${filename}`

				return filename;
			}
		);
		console.log(filenames);		
		await uploadMultipleStringsToCloud(storage, multiStringData, filenames);

		setLoadingVisible(false);
		setAlertContent(["Success!", `Successfully uploaded ${filenames.length} files to the cloud!`, null]);
		setTimeout(() => setAlertVisible(true), 500);

		return;
	}

	// Upload all the data to fileSystem
    const uploadDataToFileSystem = async () => {
		setLoadingContent([null, `Uploading ScoutingData to Filesystem...`]);
		setLoadingVisible(true);

		let multiStringData = [];
		let matchKeys2 = matchKeys.filter((keyName) => {return keyName.slice(0, 3) == "@MD"});
		try {
			multiStringData = await readMultipleDataKeys(matchKeys2);
		} catch (e) {
			setLoadingVisible(false);
			setWarningContent([null, `Couldn't get a connection to file system!\n${e}`, null]);
			setWarningVisible(true);
			return;
		}

		const status  = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
		const localFileUri = fileDir + "ScoutingFile.txt";

		var dataString ='DataType|ScouterName|Device|TeamNumber|MatchNumber|MatchType|AllianceColor|';
		dataString =dataString + 'Leave|CenterlineNoteScored|'
		dataString =dataString + 'AutoSpeaker|AutoSpeakerMisses|';
		dataString =dataString + 'AutoAmp|AutoAmpMisses|';
		dataString =dataString + 'TeleSpeaker|TeleAmplifiedSpeaker|TeleSpeakerMisses|';		
		dataString =dataString + 'TeleAmp|TeleAmpMisses|';
		dataString =dataString + 'Trap|StageClimb|Broke|NoteStuck|EventKey|Comments|ShuttledNotes\n';
		var i ;
		for(i=0; i < multiStringData.length; i++){
			dataString += `${multiStringData[i]}\n`;
		}
			
		await FileSystem.writeAsStringAsync(localFileUri, dataString, { encoding: FileSystem.EncodingType.UTF8 });

		
		if (status.granted) {
			await FileSystem.StorageAccessFramework.createFileAsync(status.directoryUri,"ScoutingFile.txt", "text/plain")
			.then ( async (localFileUri) => {
				await FileSystem.writeAsStringAsync(localFileUri, dataString, { encoding: FileSystem.EncodingType.UTF8 });
			})
			.catch (e => console.log(e));

		} else {
			Sharing.shareAsync(localFileUri)
		}

		setLoadingVisible(false);
		setAlertContent(["Success!", `Successfully downloaded file to the filesystem!`, null]);
		setTimeout(() => setAlertVisible(true), 500);

		return;
	}

	// Loads all keys and removes any that don't contain matchdata
	React.useEffect(() => {
		// Loads and stores settings
		const wrapper = async () => {
			const loadedSettings = await loadSettings();
			setSettings(loadedSettings);
		}

        loadKeys();
        initializeFirebaseFromSettings();
		wrapper();

    }, []);

	const deleteCallback = async () => {
		try {
			await deleteMultipleDataKeys(matchKeys);
			loadKeys();
		} catch (e) {
			console.error(e)
		}
	}
    
    return (
		<View style={globalContainerStyles.topContainer}>
			<TTGradient/>

			{/* This is an upsetting amount of boilerplate */}
            <TTAlert
                state={alertVisible}
                setState={setAlertVisible}
                title={alertContent[0]}
                mainText={alertContent[1]}
                acceptText={alertContent[2]}
            />
			<TTWarning
                state={warningVisible}
                setState={setWarningVisible}
                title={warningContent[0]}
                mainText={warningContent[1]}
                acceptText={warningContent[2]}
            />
			<TTConfirmation
                state={confirmationVisible}
                setState={setConfirmationVisible}
                title={confirmationContent[0]}
                mainText={confirmationContent[1]}
                acceptText={confirmationContent[2]}
                rejectText={confirmationContent[3]}
                acceptCallback={deleteCallback}
            />
			<TTLoading
                state={loadingVisible}
                setState={setLoadingVisible}
                title={loadingContent[0]}
                mainText={loadingContent[1]}
                acceptText={loadingContent[2]}
            />

			{/* Match buttons */}
			<ScrollView style={{paddingTop: 2*vh}}>
				{
					matchKeys.map((keyName, i) => (
						<View key={i} style={{flexDirection: "row", alignSelf: "center"}}>
							<TTButton
								text={keyName.slice(3)}
								buttonStyle={{...globalButtonStyles.matchKeyButton, width: 80 * vw, marginVertical: 1 * vh}}
								textStyle={{...globalTextStyles.matchKeyText}}
								onPress={async () => {
									if (keyName.slice(0, 3) == "@MD"){
										const matchData = await loadMatchData(keyName)
										navigation.navigate("ScoutTeam", {matchData: matchData})
									} else {
										const pitData = await loadPitData(keyName)
										navigation.navigate("PitScout", {pitData: pitData})
									}
								}}
							/>
							<TTButton
								text="X"
								buttonStyle={{...globalButtonStyles.matchKeyButton, backgroundColor: CS.accent3, marginHorizontal: 0}}
								textStyle={{...globalTextStyles.matchKeyText, color: CS.light1}}
								onPress={async () => {
									await deleteData(keyName);
									await loadKeys();
								}}
							/>
						</View>
					))
				}
				<View style={{marginTop: 1*vh}}></View>
				{matchKeys.length > 0 && <TTButton
					text="Delete Local Data"
					buttonStyle={{...globalButtonStyles.secondaryButton, width: "90%", margin: 1 * vh}}
					textStyle={{...globalTextStyles.primaryText, fontSize: 16 * fU}}
					onPress={() => {
						setConfirmationVisible(true);
						setConfirmationContent([null, `Are you sure you want to delete all ${matchKeys.length} files? You wont be able to get them back.`, null, null]);
					}}
				/>}
				<View style={{marginBottom: 4*vh}}></View>
				
			</ScrollView>

			{/* Second to bottom button */}
			<View style={{backgroundColor: CS.transparent}}>
				<TTGradient/>

					<TTButton
						text="Download Data to File"
						buttonStyle={{...globalButtonStyles.primaryButton, width: "90%", margin: 2 * vh}}
						textStyle={{...globalTextStyles.primaryText, fontSize: 24 * fU}}
						onPress={() => {uploadDataToFileSystem()}}
					/>
		
			</View>

			{/* Bottom button */}
			<View style={{backgroundColor: CS.transparent}}>
				<TTGradient/>

				{ (settings !== null && settings?.permissions === "editor") &&
					<TTButton
						text="Upload Data To Cloud"
						buttonStyle={{...globalButtonStyles.primaryButton, width: "90%", margin: 2 * vh}}
						textStyle={{...globalTextStyles.primaryText, fontSize: 24 * fU}}
						onPress={() => {uploadDataToCloud()}}
					/>
				}
				{
					(settings !== null && settings?.permissions !== "editor") &&
					<Text style={{...globalTextStyles.labelText, fontFamily: "LGC Light", color: CS.light2, margin: 2*vh}}>
						You don't have permission to upload to the bucket you're connected to!
					</Text>
				}
				
			</View>
        </View>
    );
}

// Exports
export default LocalData;