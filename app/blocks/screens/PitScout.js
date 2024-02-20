// Library imports
import * as React from 'react';
import { StyleSheet, Text, View, Image, ScrollView, Modal,KeyboardAvoidingView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, CameraType, PermissionStatus } from 'expo-camera';

// Component imports
import { fU, vh, vw } from '../../common/Constants';
import { globalButtonStyles, globalInputStyles, globalTextStyles, globalContainerStyles } from '../../common/GlobalStyleSheet';
import { TTButton, TTCheckbox, TTPushButton, TTSimpleCheckbox } from '../components/ButtonComponents';
import { TTCounterInput, TTDropdown, TTNumberInput, TTTextInput } from '../components/InputComponents';
import { serializeData, deserializeData, compressData, decompressData, savePitData, loadPitData,loadOtherSettings} from '../../common/LocalStorage'
import { TTGradient } from '../components/ExtraComponents';
import { ColorScheme as CS } from '../../common/ColorScheme';

// Main function
const PitScout = ({route, navigation}) =>
{    
    const [scouterName, setScouterName] = React.useState("");
    const [teamNumber, setTeamNumber] = React.useState("");
    const [driveTrain, setDriveTrain] = React.useState("Drive Train");
    const driveTrainValues = ["Swerve", "Tank", "Other"];
    const [motors, setMotors] = React.useState("Motors");
    const motorValues = ["Brushless","Brushed","Both"];    
    const [batteries, setBatteries] = React.useState("");
    const [language, setLanguage] = React.useState("Language");
    const languageValues = ["Java", "C/C++", "Labview", "Python", "Other"];
    const [codeParadigm, setCodeParadigm] = React.useState("Code Paradigm");
    const codeParadigmValues = ["Command", "Timed", "Other"];
    const [humanPlayer, setHumanPlayer] = React.useState("Human Player");
    const humanPlayerValues = ["Own","Other"];
    const [overallStatus, setOverallStatus] = React.useState("");
    const [climb, setClimb] = React.useState("Climb");
    const climbValues = ["Center","Edge", "Both", "None"];
    const [underStage, setUnderStage] = React.useState("");
    const [shootingLocation, setShootingLocations] = React.useState("Shooting Area");
    const ShootingLocationValues = ["Subwoofer", "Mid", "Far", "Sub & Mid", "All", "None"];
    const [weight,setWeight] = React.useState("");

    const [comments, setComments] = React.useState("");
    const [eventKey, setEventKey] = React.useState("");
    const [dataType, setDataType] = React.useState("Pit");
    const [uploadPhoto, setUploadPhoto] = React.useState(false);
    const [type, setType] = React.useState(CameraType.back);
    const [permission, requestPermission] = Camera.useCameraPermissions();
    const [photos, setPhotos] = React.useState([]);
    const [photoIndex, setPhotoIndex] = React.useState(0);

    function toggleCameraType() {
        setType(current => (current === CameraType.back ? CameraType.front : CameraType.back));
    }
    // Prevents nothing entries
    const formatNumericState = (state) => {
        return ((state != "") ? Number(state) : 0);
    }
    const formatNameState = (state) => {
        return ((state != "") ? state.trim() : 0);
    }
    // Serializes the data to a string and saves it
    const saveAndExit = async () => {
        const pitData = [
            dataType, //0
            // Pre Round
            formatNameState(scouterName), //1
            formatNumericState(teamNumber), //2

            /* pit data */
            formatNameState(driveTrain), //3
            formatNameState(motors), //4
            formatNameState(batteries), //5
            formatNumericState(weight), //6
            formatNameState(language), //7
            formatNameState(codeParadigm), //8
            formatNameState(humanPlayer), //9
            underStage ? 1 : 0, //10
            formatNameState(climb), //11
            formatNameState(shootingLocation), //12
            formatNumericState(overallStatus), //13

            // After Round
            eventKey, //14
            comments, //15
            photos, //16
        ];

        // Save data using hash
        try {
            await savePitData(pitData);
            navigation.navigate("Home");
        } catch (e) {
            console.error(`Error Saving Data: ${e}`);
        }
    };

    const loadSavedData = (data) => {

        console.log(data);

        setDataType(data[0]);
        // Pre Round
        
        setScouterName(data[1]);
        setTeamNumber(data[2]);

        setDriveTrain(data[3]),
        setMotors(data[4]),
        setBatteries(data[5]),
        setWeight(data[6]),
        setLanguage(data[7]),
        setCodeParadigm(data[8]),
        setHumanPlayer(data[9]),
        setUnderStage( Number(data[10]) ? true : false ),
        setClimb(data[11]),
        setShootingLocations(data[12]),
        setOverallStatus(data[13]),

        // After Round
        
        setEventKey(data[14]);
        setComments(data[15]);

        if (data[16].length > 0) {           
            setPhotos(data[16].split(","));
        }
    }

    React.useEffect(() => {
        //Load setting defaults from tba and other settings if configured. 
        const loadOtherSettingsToState = async () => {
            //Get Other Settings used to pull TBA data and determine device
            const loadedOtherSettings = await loadOtherSettings();
            if(loadedOtherSettings){
                setEventKey(loadedOtherSettings.eventKey);
            };

            setTeamNumber("");   
            setUploadPhoto(false);

            const getCameraPermissions = async () => {
                const { status } = await Camera.requestCameraPermissionsAsync();
                requestPermission(status === PermissionStatus.GRANTED);
            };
            getCameraPermissions();

        };
        
        //Load data if a prior scouting match was passed to page. 
        if (route?.params?.pitData) {
            loadSavedData(route.params.pitData);
        } else {
            loadOtherSettingsToState();  
        }

    }, []);

    const scrollRef = React.useRef(null);
    const ref = React.useRef(null);

    const handlePhoto = async () => {
        const options = { quality: 0.4, skipProcessing: true};
        const photo = await ref.current.takePictureAsync(options);

        //console.log(photo.uri);
        const photopath = photo.uri;

        setPhotos([
            ...photos,
            photopath
          ]);
        setPhotoIndex(photos.length);
    }
    
    if (!permission){
        return (
            <View style={globalContainerStyles.centerContainer}>
                <TTGradient/>
                <Text style={globalTextStyles.labelText}>Requesting for camera permission...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={globalContainerStyles.centerContainer}>
                <TTGradient/>
                <Text style={{...globalTextStyles.secondaryText, fontSize: 30, marginHorizontal: 3*vh}}>
                    TrobotScout doesn't have access to your camera!
                </Text>
                <Text style={{...globalTextStyles.labelText, color: `${CS.light1}80`, margin: 3*vh}}>
                    You need to enable camera permissions in your phone's settings.
                </Text>
            </View>
        );
    }

    return (
        <View style={globalContainerStyles.topContainer}>
        <TTGradient/>

        <Modal
            animationType="slide"
            transparent={false}
            visible={uploadPhoto}
            onRequestClose={() => {
                Alert.alert('Modal has been closed.');
                setUploadPhoto(false);
            }}>
            <View style={{flex: 1, flexDirection: "column", alignContent: "center", justifyContent: "space-around", padding: 3*vh}}>
                <Camera style={styles.camera} type={type} ref={ref}>
                    <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.button} onPress={handlePhoto}>
                        <Text style={{...globalButtonStyles.primaryButton, fontFamily: "LGC", color: CS.light1, fontSize: 24*fU, alignSelf: "center",  textAlign: "center",width: "100%", margin: 3*vh}}>Take Photo</Text>
                    </TouchableOpacity>
                    </View>
                </Camera>

                <TTButton 
                    text="Close" 
                    onPress={() => {setUploadPhoto(false)}}
                    buttonStyle={{...globalButtonStyles.primaryButton, width: "100%", margin: 3*vh}} 
                    textStyle={globalTextStyles.secondaryText}
                />
            </View>
            </Modal>
            {/* All scouting settings go in the scroll view */}
            <KeyboardAvoidingView style={{flex: 1}} behavior="height">
            <ScrollView keyboardShouldPersistTaps='handled' ref={scrollRef}>
                <View style={{height:70*vh, zIndex: 1}}>
                    <Text style={styles.sectionHeader}>Pit Scout</Text>

                    <View style={{...styles.rowAlignContainer, zIndex: 7}}>
                        {/* ScouterName */}

                        <TTTextInput
                            state={scouterName}
                            setState={setScouterName}
                            maxLength={30}
                            placeholder="Scouter Name"
                            placeholderTextColor={`${CS.light1}50`}
                            style={[
                                {...globalInputStyles.numberInput, width: 45*vw, height: 5*vh},
                                globalTextStyles.labelText
                            ]}
                        />
                        {/* Team number */}
                        <TTNumberInput
                            state={teamNumber}
                            setState={setTeamNumber}
                            stateMax={9999}
                            maxLength={4}
                            placeholder="Team #"
                            placeholderTextColor={`${CS.light1}50`}
                            style={styles.topNumberInput}
                        />
                    </View>
                    
                    <View style={{...styles.rowAlignContainer, zIndex: 10}}>

                    {/* drive Train */}
                        <TTDropdown 
                            state={driveTrain} 
                            setState={setDriveTrain} 
                            items={driveTrainValues}
                            boxWidth={40*vw}
                            boxHeight={5*vh}
                            boxStyle={globalInputStyles.dropdownInput}
                            textStyle={globalTextStyles.labelText}
                            zIndex={5}
                        />

                    {/* Motor */}
                        <TTDropdown 
                            state={motors} 
                            setState={setMotors} 
                            items={motorValues}
                            boxWidth={40*vw}
                            boxHeight={5*vh}
                            boxStyle={globalInputStyles.dropdownInput}
                            textStyle={globalTextStyles.labelText}
                            zIndex={6}
                        />
                    </View>
                    
                    <View style={{...styles.rowAlignContainer, zIndex: 9}}>

                        <TTNumberInput
                            state={batteries}
                            setState={setBatteries}
                            stateMax={99}
                            maxLength={2}
                            placeholder="Battery #"
                            placeholderTextColor={`${CS.light1}50`}
                            style={styles.topNumberInput}
                        />
                        
                        <TTNumberInput
                            state={weight}
                            setState={setWeight}
                            stateMax={125}
                            maxLength={3}
                            placeholder="Weight"
                            placeholderTextColor={`${CS.light1}50`}
                            style={styles.topNumberInput}
                        />
                    </View>

                    <View style={{...styles.rowAlignContainer, zIndex: 8}}>

                    {/* language */}
                        <TTDropdown 
                            state={language} 
                            setState={setLanguage} 
                            items={languageValues}
                            boxWidth={40*vw}
                            boxHeight={5*vh}
                            boxStyle={globalInputStyles.dropdownInput}
                            textStyle={globalTextStyles.labelText}
                            zIndex={8}
                        />
                    {/* structure */}
                        <TTDropdown 
                            state={codeParadigm} 
                            setState={setCodeParadigm} 
                            items={codeParadigmValues}
                            boxWidth={40*vw}
                            boxHeight={5*vh}
                            boxStyle={globalInputStyles.dropdownInput}
                            textStyle={globalTextStyles.labelText}
                            zIndex={9}
                        />
                    </View>

                    <View style={{...styles.rowAlignContainer, zIndex: 7}}>

                    {/* human player */}
                        <TTDropdown 
                            state={humanPlayer} 
                            setState={setHumanPlayer} 
                            items={humanPlayerValues}
                            boxWidth={40*vw}
                            boxHeight={5*vh}
                            boxStyle={globalInputStyles.dropdownInput}
                            textStyle={globalTextStyles.labelText}
                            zIndex={5}
                        />

                    {/* under stage */}
                        <TTSimpleCheckbox 
                            state={underStage}
                            setState={setUnderStage}
                            text="Under Stage" 
                            overallStyle={{height: "100%", alignSelf: "center"}}
                            textStyle={{...globalTextStyles.labelText}}
                            boxUncheckedStyle={{...globalButtonStyles.checkboxUncheckedStyle}}
                            boxCheckedStyle={{...globalButtonStyles.checkboxCheckedStyle}}
                        />
                    </View>
                    <View style={{...styles.rowAlignContainer, zIndex: 6}}>

                    {/* climb */}
                        <TTDropdown 
                            state={climb} 
                            setState={setClimb} 
                            items={climbValues}
                            boxWidth={40*vw}
                            boxHeight={5*vh}
                            boxStyle={globalInputStyles.dropdownInput}
                            textStyle={globalTextStyles.labelText}
                            zIndex={5}
                        />

                    {/* shooting locations */}
                        <TTDropdown 
                            state={shootingLocation} 
                            setState={setShootingLocations} 
                            items={ShootingLocationValues}
                            boxWidth={40*vw}
                            boxHeight={5*vh}
                            boxStyle={globalInputStyles.dropdownInput}
                            textStyle={globalTextStyles.labelText}
                            zIndex={6}
                        />
                    </View>
                    <View style={{...styles.rowAlignContainer, zIndex: 5}}>
                    
                        <TTNumberInput
                            state={overallStatus}
                            setState={setOverallStatus}
                            stateMax={10}
                            maxLength={10}
                            placeholder="Overall Status 1-10"
                            placeholderTextColor={`${CS.light1}50`}
                            style={styles.topNumberInput}
                        />
                    </View>
                    <View style={{marginBottom: 5*vh}}/>

                </View>

                <View style={{height: 75*vh}}>
                    <TTGradient/>
                    <View style={styles.rowAlignContainer}>
                    <TTButton
                        text="Open Camera"
                        buttonStyle={{...globalButtonStyles.secondaryButton, width: "100%"}} 
                        textStyle={globalTextStyles.secondaryText}
                        onPress={() => setUploadPhoto(true)}
                    />
                    </View>
                    <View style={styles.rowAlignContainer}>
                    <Image
                        style={styles.tinyLogo}
                        source={{uri: photos[photoIndex]}}
                    />
                    </View>
                    <View style={styles.rowAlignContainer}>
                    <TTButton 
                        text="<" 
                        onPress={() => {setPhotoIndex(photoIndex - 1);}}
                        buttonStyle={{...globalButtonStyles.secondaryButton, width: "45%", margin: 3*vh}} 
                        textStyle={globalTextStyles.secondaryText}
                    />
                    <TTButton 
                        text=">" 
                        onPress={() => {setPhotoIndex(photoIndex + 1);}}
                        buttonStyle={{...globalButtonStyles.secondaryButton, width: "45%", margin: 3*vh}} 
                        textStyle={globalTextStyles.secondaryText}
                    />
                    </View>
                    <View style={styles.rowAlignContainer}>
                        <TTTextInput
                            state={comments}
                            setState={setComments}
                            placeholder="Comments/Assistance Needed? (1000 characters)"
                            placeholderTextColor={`${CS.light1}50`}
                            multiline={true}
                            maxLength={1000}
                            numberOfLines={4}
                            onFocus={() => {scrollRef.current.scrollToEnd()}}
                            style={[
                                {...globalInputStyles.numberInput, width: "90%", height: "90%"},
                                globalTextStyles.labelText
                            ]}
                        />
                    </View>

                    {/* Rudamentary spacer */}
                    <View style={{marginBottom: 5*vh}}/> 
                </View>
                
                <View style={{...globalContainerStyles.centerContainer, backgroundColor: "#00000000"}}>
                    <TTButton
                        text="Save Data"
                        buttonStyle={{...globalButtonStyles.primaryButton, width: "90%", margin: 5*vh}}
                        textStyle={{...globalTextStyles.primaryText, fontSize: 36*fU}}
                        onPress={saveAndExit}
                    />
                </View>

            </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
    }

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    tinyLogo: {
        width: 200,
        height: 200,
    },
    camera: {
        flex: 1,
    },
    buttonContainer: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: 'transparent',
        margin: 64,
    },
    button: {
        flex: 1,
        alignSelf: 'flex-end',
        alignItems: 'center',
    },
    text: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
    },
    sectionHeader: {
        ...globalTextStyles.primaryText, 
        fontSize: 24*fU, 
        margin: 1.5*vh
    },
    topNumberInput: {
        ...globalInputStyles.numberInput, 
        ...globalTextStyles.labelText,
        margin: 0,
        width: 45*vw, 
        height: 5*vh,
    },
    rowAlignContainer: {
        ...globalContainerStyles.rowContainer, 
        width: "100%", 
        alignItems: "center", 
        justifyContent: "space-evenly",
    },
    counterHeader: {
        ...globalTextStyles.labelText, 
        fontSize: 15*fU, 
        alignSelf: "center", 
        position: "absolute", 
        top: 2.6*vh
    }
});


// Exports
export default PitScout;
