// Library imports
import * as React from 'react';
import { getStorage } from 'firebase/storage';
import { getApp, getApps } from "firebase/app";
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

// Component imports
import { vh, vw, fU } from '../../common/Constants';
import { globalButtonStyles, globalInputStyles, globalTextStyles, globalContainerStyles } from '../../common/GlobalStyleSheet';
import { readStringFromCloud, initializeFirebaseFromSettings, getAllFilesFromCloud, downloadAllFilesFromCloud, downloadPitFilesFromCloud, uploadMultipleStringsToCloud } from '../../common/CloudStorage';
import { TTButton, TTSimpleCheckbox } from '../components/ButtonComponents';
import { TTGradient, TTLoading } from '../components/ExtraComponents';
import { loadCloudCache, loadPitCache, loadSettings, saveCloudCache, savePitCache, loadTbaEventCache } from '../../common/LocalStorage';
import { ColorScheme as CS } from '../../common/ColorScheme';
import { TTDropdown, TTCounterInput, TTNumberInput } from '../components/InputComponents';

const sortableValues = ["Team Number", "Total Points","Auto Points", "Teleop Points", "Misses", "Speaker", "Amp", "Endgame Points"];
const sortableKeys = [null, "total","auto", "teleop", "misses", "speaker", "amp", "endgame"];

// Main function
const CloudData = ({route, navigation}) => {
    // Settings
    const [settings, setSettings] = React.useState(null);
    const [tbaeventcache, setTbaEventCache] = React.useState({});

    // Loading states
    const [loadingVisible, setLoadingVisible] = React.useState(false);
    const [loadingContent, setLoadingContent] = React.useState([]);

    // Loaded cloud data
    const [cloudData, setCloudData] = React.useState([]);
    const [pitData, setPitData] = React.useState([]);
    const [statistics, setStatistics] = React.useState([]);
    const [teamOrder, setTeamOrder] = React.useState([]);


    // Normal states
    const [sortBy, setSortBy] = React.useState(sortableValues[0]);    
    const [filterBy, setFilterBy] = React.useState("0");
    const [reverseSort, setReverseSort] = React.useState(false);

    const getClimbScore = (climbValue) => {

        switch (climbValue){
            case 0 :
                return 0;
            case 1 :
                return 1;
            case 2 :
                return 3;
            case 3 :
                return 4;
            default :
                return 0;
        }

    }

    // Calculates average statistics
    const calculateAverages = (teamData) => {
        const teamAverages = {};
        // Loop over every team
        for (const teamNumber of Object.keys(teamData)) {
            
            const averages = { total: 0, auto: 0, teleop: 0, misses: 0, speaker: 0, amp: 0, endgame: 0 };
            const count = teamData[teamNumber].length;
            // For every md (match data), add to the average for each stat

            for (const md of teamData[teamNumber]) {
                //console.log(md);
                // This is horrible
                averages.total += 2*Number(md[11]) + 5*Number(md[9])+ 2*Number(md[7])
                + 1*Number(md[16]) + 2*Number(md[13])+ 5*Number(md[14])
                + 5*Number(md[18]) + getClimbScore(Number(md[19]));
                averages.auto += 2*(Number(md[11])) + 5*(Number(md[9]))+ 2*(Number(md[7]));
                averages.teleop += 1*(Number(md[16])) + 2*(Number(md[13]))+ 5*(Number(md[14]));
                averages.misses += Number(md[15]) + Number(md[17])+ Number(md[12]) + Number(md[10]);
                averages.speaker += Number(md[9])+Number(md[13])+Number(md[14]);
                averages.amp += Number(md[11])+Number(md[16]);
                averages.endgame += 5*Number(md[18]) + getClimbScore(Number(md[19]));
                //console.log(averages.auto);
            }
            //console.log(averages);
            // Average out and round
            averages.total = Math.round(10*averages.total / count) / 10;
            averages.auto = Math.round(10*averages.auto / count) / 10;
            averages.teleop = Math.round(10*averages.teleop / count) / 10;
            averages.misses = Math.round(10*averages.misses / count) / 10;
            averages.speaker = Math.round(10*averages.speaker / count) / 10;
            averages.amp = Math.round(10*averages.amp / count) / 10;
            averages.endgame = Math.round(10*averages.endgame / count) / 10;

            teamAverages[teamNumber] = averages;
            }
        
            //console.log(teamAverages);
        return teamAverages;
    }

    const coneCounterSettings = {
        stateMin: 0,
        stateMax: 300,
        overallStyle: {justifySelf: "center", marginTop: 0*vh},
        topButtonProps: {text: "+", buttonStyle: [{...globalButtonStyles.topCounterButton, backgroundColor: CS.accent2},{height: 5*vh,width: 15*vw, padding: 0}], textStyle: globalTextStyles.secondaryText},
        inputProps: {style: [globalInputStyles.numberInput, globalTextStyles.labelText, {height: 5*vh, width: 15*vw, margin: 0}]},
        bottomButtonProps: {text: "-", buttonStyle: [{...globalButtonStyles.bottomCounterButton, backgroundColor: CS.accent2}, {height: 5*vh,width: 15*vw, padding: 0}], textStyle: globalTextStyles.secondaryText}
    }

    const getMatchTeams = (filterKey) =>
    {
        const loadedTBAEvent = tbaeventcache;
       
        var array = [];

        if (loadedTBAEvent ) {

            for (i = 0; i < JSON.parse(loadedTBAEvent).length; i++) {
                const data = JSON.parse(loadedTBAEvent)[i];
                //console.log(data);
                try{
                    if (data) {
                        mt = data.complevel;
                        mn = data.matchnumber;

                        if (mt == "qm" && mn == filterKey) {
                            array.push(Number(data.blue3.replace("frc","")));
                            array.push(Number(data.blue2.replace("frc","")));
                            array.push(Number(data.blue1.replace("frc","")));
                            array.push(Number(data.red3.replace("frc","")));
                            array.push(Number(data.red2.replace("frc","")));
                            array.push(Number(data.red1.replace("frc","")));
                        }
                    }  
                } catch(e) {
                    console.error(e);
                }
            }
        }
            
        return array;
    }

    // Sorts an object by key values of another object
    // Ultra specified to work just for sorting by statistics
    const getSortedObjectOrder = (baseObject, valuesObject, sortKey, reverse, filterKey) => {
               
        //console.log(reverse);
        //console.log(filterKey);
        //console.log(sortKey);
        //console.log(valuesObject);

        var objectKeys = Object.keys(valuesObject);

        const compareFunction = (a, b) => {
            //    console.log(valuesObject[a][sortKey]);
                return valuesObject[a][sortKey] - valuesObject[b][sortKey];
            }

        const compareFunction2 = (a, b) => {
            //    console.log(valuesObject[a][sortKey]);
                return a - b;
            }

        if (filterKey > 0)
        {

            var array = getMatchTeams(String(filterKey));
            array = array.sort((a, b) => compareFunction2(a, b));
            var objectKeys2 = [];
  
            for (i = 0; i < array.length; i++) {
                var item = array[i];
                var item2 = objectKeys.filter((name) => name == String(item));
                if (item == item2) {
                    objectKeys2.push(String(item));
                }
            }

            //console.log(objectKeys2);
            objectKeys = objectKeys2;
        }

        if (sortKey === null) {
            return reverse ? objectKeys.reverse() : objectKeys;
        }
        

        const sortedKeys = objectKeys.sort((a, b) => compareFunction(reverse ? b : a, reverse ? a : b));
        //console.log(sortedKeys);
        
        return sortedKeys;
    }

    // Sorts an object by key values of another object
    // Ultra specified to work just for sorting by statistics

    const sortMatches = (teamData) => {
        //Sort matches by matchtype, 5th element in team array, and matchnumber, 4th element
        const compareFunction = (a, b) => {

            return (
                (Number(a[5])+1) * Number(a[4]) -
                (Number(b[5])+1) * Number(b[4])
            )
        }
        //console.log(teamData.sort(compareFunction));
        return teamData.sort(compareFunction);
    }

    // Initial loading
    React.useEffect(() => {
        setLoadingContent([null, "Loading local cache..."]);

        const wrapper = async () => {
            const loadedSettings = await loadSettings();
            setSettings(loadedSettings);

            const loadedCache = await loadCloudCache();
            const loadedPitCache = await loadPitCache();

            if (loadedCache !== null) {
                setCloudData(loadedCache);
                setTeamOrder(Object.keys(loadedCache));
                setStatistics(calculateAverages(loadedCache));
            }
            if (loadedPitCache !== null) {
                setPitData(loadedPitCache);
            }

            const loadedTBAEvent = await loadTbaEventCache();
            setTbaEventCache(loadedTBAEvent);
    
        };
    
        initializeFirebaseFromSettings();
        wrapper();
    }, []);

    const downloadAndStoreCloudData = async () => {
        setLoadingContent([null, "Downloading all cloud files to device..."]);
        setLoadingVisible(true);

        const storage = getStorage();
        const downloadedData = await downloadAllFilesFromCloud(storage, settings.subpath ? settings.subpath : "");
        const downloadedPitData = await downloadPitFilesFromCloud(storage, settings.subpath ? settings.subpath : "");
        await saveCloudCache(downloadedData);
        await savePitCache(downloadedPitData);

        setCloudData(downloadedData);
        setPitData(downloadedPitData);
        setTeamOrder(Object.keys(downloadedData));
        setStatistics(calculateAverages(downloadedData));
 
        setLoadingVisible(false);
    }


    // Special case that's not worth making a TTButton or globalButtonStyle for
    const MatchKeyButton = (props) => {
        const topLabelStyle = {...globalTextStyles.secondaryText, color: CS.dark3, fontSize: 16*fU};
        const bottomLabelStyle = {...globalTextStyles.secondaryText, color: CS.dark1, fontSize: 24*fU, margin: -1*vh};

        return (
            <View style={{...globalContainerStyles.rowContainer, backgroundColor: CS.light1, marginVertical: 1.3*vh, marginHorizontal: 2.6*vh, borderRadius: 1*vw}} key={props.id}>
                <View>
                    <TTButton
                        text={props.teamNumber}
                        buttonStyle={{...globalButtonStyles.secondaryButton, width: 20*vw, paddingVertical: 2*vh, margin: 0, left: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0}}
                        textStyle={{...globalTextStyles.primaryText, fontSize: 24*fU}}
                         // Maybe include rankings ?
                        onPress={
                            () => {
                                navigation.navigate("TeamAnalytics", 
                                    {
                                        teamNumber: props.teamNumber, 
                                        teamStatistics: statistics[props.teamNumber],
                                        settings: settings,
                                        teamData: Object.keys(cloudData).includes(props.teamNumber)? sortMatches(cloudData[props.teamNumber]):[],
                                        pitData: Object.keys(pitData).includes(props.teamNumber)? pitData[props.teamNumber]:[],
                                    })
                            }
                        }
                    />
                </View>
                <View style={{flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 2*vw}}>
                    <View>
                        <Text style={topLabelStyle}>Auto</Text>
                        <Text style={bottomLabelStyle}>
                            {statistics[props.teamNumber]?.auto}
                        </Text>
                    </View>
                    <View>
                        <Text style={topLabelStyle}>Teleop</Text>
                        <Text style={bottomLabelStyle}>
                            {statistics[props.teamNumber]?.teleop}
                        </Text>
                    </View>
                    <View>
                        <Text style={topLabelStyle}>Endgame</Text>
                        <Text style={bottomLabelStyle}>
                            {statistics[props.teamNumber]?.endgame}
                        </Text>
                    </View>
                    <View>
                        <Text style={topLabelStyle}>Speaker</Text>
                        <Text style={bottomLabelStyle}>
                            {statistics[props.teamNumber]?.speaker}
                        </Text>
                    </View>
                    <View>
                        <Text style={topLabelStyle}>Amp</Text>
                        <Text style={bottomLabelStyle}>
                            {statistics[props.teamNumber]?.amp}
                        </Text>
                    </View>
                </View>
            </View>
        );
    }
    const onPress = (increment) => {

        const stateMin =  0;
        const stateMax =  255;
        if (filterBy != null) {
            let newState = Number(filterBy) + increment;
            newState = Math.min(Math.max(newState, stateMin), stateMax); // Clamp between max and min
            setFilterBy(newState.toString());

            const sortKey = sortableKeys[sortableValues.indexOf(sortBy)];
            const newTeamOrder = getSortedObjectOrder(cloudData, statistics, sortKey, reverseSort, newState);
            setTeamOrder(newTeamOrder)
        }
    }

    // No cloud connection
    if (getApps().length === 0) {
        return (
            <View style={globalContainerStyles.centerContainer}>
                <TTGradient/>
                <Text style={globalTextStyles.labelText}>You're not connected to Firebase!</Text>
                <TTButton
                    text="Go To Settings"
                    buttonStyle={{...globalButtonStyles.primaryButton, width: "70%", margin: 2 * vh}}
                    textStyle={{...globalTextStyles.primaryText, fontSize: 36*fU, marginTop: 0.5*vh}}
                    onPress={() => {navigation.navigate("Settings")}}
                />
            </View>
        );
    }

    // Everything else
    return (
        <View style={globalContainerStyles.topContainer}>
            <TTLoading
                state={loadingVisible}
                setState={setLoadingVisible}
                title={loadingContent[0]}
                mainText={loadingContent[1]}
                acceptText={loadingContent[2]}
            />
            
            <View style={{...globalContainerStyles.centerContainer, flex: 0, height: 30*vh, zIndex: 2}}>
                <TTGradient/>
                {/* <Text style={{...globalTextStyles.primaryText, fontSize: 16*fU}}>
                    Youre connected to {getApp().options.projectId}
                </Text> */}
                <View style={{flexDirection: "row", justifyContent: "space-evenly", marginTop: 1*vh, zIndex: 5}}>
                    <TTButton
                        text="⟳"
                        buttonStyle={{...globalButtonStyles.primaryButton, width: 7*vh, aspectRatio: 1, margin: 2*vh}}
                        textStyle={{color: CS.light1, fontSize: 32*fU, marginTop: (Platform.OS !== 'ios') ? -1.5*vh : 0 }}
                        onPress={downloadAndStoreCloudData}
                    />
                    <Text style={globalTextStyles.labelText}>Sort By...</Text>
                    <TTDropdown 
                        state={sortBy} 
                        setState={(value) => {
                            setSortBy(value);
                            const filterKey = filterBy;
                            const sortKey = sortableKeys[sortableValues.indexOf(value)];
                            const newTeamOrder = getSortedObjectOrder(cloudData, statistics, sortKey, reverseSort, filterKey);
                            setTeamOrder(newTeamOrder);
                        }} 
                        items={sortableValues}
                        boxWidth={50*vw}
                        boxHeight={5.1*vh}
                        boxStyle={globalInputStyles.dropdownInput}
                        textStyle={globalTextStyles.labelText} 
                        overrideStyle={{margin: 5, alignSelf: "center"}}
                        zIndex={8}
                    />
                </View>  
                <View style={{flexDirection: "row", justifyContent: "space-evenly", marginTop: 1*vh, zIndex: 4}}>
                    <Text style={globalTextStyles.labelText}> Filter By Match...</Text>
                    <TTButton 
                        text="+"
                        buttonStyle={{...globalButtonStyles.primaryButton, width: 7*vh, aspectRatio: 1, margin: 2*vh}}
                        textStyle={{color: CS.light1, fontSize: 32*fU, marginTop: (Platform.OS !== 'ios') ? -1.5*vh : -1.3*vh }}
                        onPress={() => onPress(+1)} />
                    <TTNumberInput
                        state={filterBy}
                        setState={(value) => {
                            setFilterBy(value);
                            const filterKey = value;
                            const sortKey = sortableKeys[sortableValues.indexOf(sortBy)];
                            const newTeamOrder = getSortedObjectOrder(cloudData, statistics, sortKey, reverseSort, filterKey);
                            setTeamOrder(newTeamOrder);
                        }} 
                        style={[
                            {...globalInputStyles.numberInput, width: 15*vw, height: 5*vh},
                            globalTextStyles.labelText
                        ]}
                    />
                    <TTButton 
                        text="-"
                        buttonStyle={{...globalButtonStyles.primaryButton, width: 7*vh, aspectRatio: 1, margin: 2*vh}}
                        textStyle={{color: CS.light1, fontSize: 32*fU, marginTop: (Platform.OS !== 'ios') ? -1.5*vh : -1.3*vh  }}
                        onPress={() => onPress(-1)} />
                </View>
              
                <TTSimpleCheckbox 
                    state={reverseSort}
                    setState={(value) => {
                        setReverseSort(value);
                        const sortKey = sortableKeys[sortableValues.indexOf(sortBy)];
                        const filterKey = filterBy;
                        const newTeamOrder = getSortedObjectOrder(cloudData, statistics, sortKey, value, filterKey);
                        setTeamOrder(newTeamOrder);
                    }}
                    text="Reverse Order?" 
                    overallStyle={{alignSelf: "center"}}
                    textStyle={{...globalTextStyles.labelText, fontSize: 14*fU}}
                    boxUncheckedStyle={{...globalButtonStyles.checkboxUncheckedStyle}}
                    boxCheckedStyle={{...globalButtonStyles.checkboxCheckedStyle}}
                />
            </View>
            <View style={globalContainerStyles.centerContainer}>
                <TTGradient/>
                <ScrollView style={{paddingTop: 1.3*vh}}>
                    {teamOrder.map((item, index) => {
                        return <MatchKeyButton key={index} id={index} teamNumber={item}/>;
                    })}
                    <View style={{padding: 2*vh}}/>
                </ScrollView>
            </View>
        </View>
    );
}

// Exports
export default CloudData ;