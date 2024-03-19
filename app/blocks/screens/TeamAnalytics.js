// Library Imports
import * as React from 'react';
import { ScrollView,  Image,StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

// Component Imports
import { ColorScheme as CS } from '../../common/ColorScheme';
import { fU, vh, vw } from '../../common/Constants';
import { globalContainerStyles, globalButtonStyles, globalInputStyles, globalTextStyles } from '../../common/GlobalStyleSheet';
import { TTGradient } from '../components/ExtraComponents';
import { TTDropdown } from '../components/InputComponents';
import { matchTypeValues, teamColorValues,stageValues } from './ScoutTeam';
import {getSortedObjectOrder} from './CloudData';

const chartableValues = ["Auto Points", "Teleop Points", "Speaker", "Amp", "Misses", "Endgame Points"];

const TeamAnalytics = ({route, navigation}) => {

    // States
    const [chartValue, setChartValue] = React.useState("Teleop Points");
    const [chartData, setChartData] = React.useState([]);
    const [chartLabels, setChartLabels] = React.useState([]);
    const [firebaseURL,setFirebaseURL] = React.useState("");
    const [subpath,setSubpath] = React.useState("");

    const checkEmptyComments = () => {
        for (const match of route.params.teamData) {
            if (match[24].length !== 0) return false;
        }
        for (const pit of route.params.pitData) {
            if (pit[15].length !==0)return false;
        }
        return true;
    }

    const getImage = (imageName, firebaseURL, subpath) => {
        if (subpath.startsWith("/")){
            subpath = subpath.substring(1);
        }
        const uri = "https://firebasestorage.googleapis.com/v0/b/"+firebaseURL+"/o/" + subpath +"%2FPhotos%2F" + imageName + "?alt=media";
        //console.log(uri);

        return uri;
    }

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

    const checkForDNP = () => {
        for (const match of route.params.teamData) {
            const comment = match[24].toLowerCase().replace(/’/g, "'");
            if (
                comment.includes("dnp") || 
                comment.includes("don't pick") || 
                comment.includes("dont pick") || 
                comment.includes("do not pick")
            ) return true;
        }
        for (const pit of route.params.pitData) {
            const comment = pit[15].toLowerCase().replace(/’/g, "'");
            if (
                comment.includes("dnp") || 
                comment.includes("don't pick") || 
                comment.includes("dont pick") || 
                comment.includes("do not pick")
            ) return true;
        }
        return false;
    }

    // Should be a better way to do this
    const getSpecificData = (section) => {
        switch (section) {
            case ("Total Points"): {
                const points = route.params.teamData.map((md) => {
                    return 2*Number(md[11]) + 5*Number(md[9])+ 2*Number(md[7])
                    + 1*Number(md[16]) + 2*Number(md[13])+ 5*Number(md[14])
                    + 5*Number(md[18]) + getClimbScore(Number(md[19]));
                });
                return points;
            } break;
            case ("Auto Points"): {
                const points = route.params.teamData.map((md) => {
                    return 2*(Number(md[11])) + 5*(Number(md[9]))+ 2*(Number(md[7]));
                });
                return points;
            } break;
            case ("Teleop Points"): {
                const points = route.params.teamData.map((md) => {
                    return 1*(Number(md[16])) + 2*(Number(md[13]))+ 5*(Number(md[14]));
                });
                return points;
            } break;
            case ("Misses"): {
                const count = route.params.teamData.map((md) => {
                    return Number(md[15]) + Number(md[17])+ Number(md[12]) + Number(md[10]);
                });
                return count;
            } break;
            case ("Endgame Points"): {
                const count = route.params.teamData.map((md) => {
                    return 5*Number(md[18]) + getClimbScore(Number(md[19]));
                });
                return count;
            } break;
            case ("Speaker"): {
                const count = route.params.teamData.map((md) => {
                    return Number(md[9])+Number(md[13])+Number(md[14]);
                });
                return count;
            } break;
            case ("Amp"): {
                const count = route.params.teamData.map((md) => {
                    return Number(md[11])+Number(md[16]);
                });
                return count;
            } break;
        }
    }

    React.useEffect(() => {
        const matchAbbreviations = route.params.teamData.map((item) => {
            var matchName = matchTypeValues[item[5]][0] + item[4].toString()
            return `${matchName}`;
        });
        
        console.log(matchAbbreviations);
      //  console.log(route.params.teamData);

        setChartLabels(matchAbbreviations);
        setChartData(getSpecificData("Teleop Points"));

        setSubpath(route.params.settings.subpath);
        setFirebaseURL(route.params.settings.cloudConfig.storageBucket);
    }, [])

    // Individual match data component
    const MatchDataBox = (props) => {
        return (
            <View key={props.id} style={styles.matchDataContainer}>
                <Text style={{...globalTextStyles.secondaryText, fontSize: 24*fU, color: CS.dark1}}>
                    {matchTypeValues[props.matchData[5]]} {props.matchData[4]}  —  {teamColorValues[props.matchData[7]]}
                </Text>

                {/* Auto subcontainer */}
                <View style={styles.matchDataSubcontainer}>
                    <Text style={{...globalTextStyles.secondaryText, fontSize: 20*fU, color: CS.dark1}}>
                        Auto
                    </Text>
                    <View style={styles.rowAlignContainer}>
                        <Text style={styles.dataLabel}><Text style={styles.dataText}>{props.matchData[7] == 1 ? "" : "No"}</Text> Leave</Text>
                        <Text style={styles.dataLabel}><Text style={styles.dataText}>{props.matchData[8] == 1 ? "" : "No"}</Text> Centerline Note Scored</Text>
                    </View>
                    <View style={styles.rowAlignContainer}>
                        <Text style={styles.dataLabel}>Speaker-<Text style={styles.dataText}>{props.matchData[9]}</Text></Text>
                        <Text style={styles.dataLabel}>Speaker Misses-<Text style={styles.dataText}>{props.matchData[10]}</Text></Text>
                    </View>
                    <View style={styles.rowAlignContainer}>
                        <Text style={styles.dataLabel}>Amp-<Text style={styles.dataText}>{props.matchData[11]}</Text></Text>
                        <Text style={styles.dataLabel}>Amp Misses-<Text style={styles.dataText}>{props.matchData[12]}</Text></Text>
                    </View>
                </View>

                {/* Teleop Subcontainer */}
                <View style={styles.matchDataSubcontainer}>
                    <Text style={{...globalTextStyles.secondaryText, fontSize: 20*fU, color: CS.dark1}}>
                        Teleop
                    </Text>

                    <View style={styles.rowAlignContainer}>
                        <Text style={styles.dataLabel}>Speaker-<Text style={styles.dataText}>{props.matchData[13]}</Text></Text>
                        <Text style={styles.dataLabel}>AmpSpeaker-<Text style={styles.dataText}>{props.matchData[14]}</Text></Text>
                        <Text style={styles.dataLabel}>Speaker Miss-<Text style={styles.dataText}>{props.matchData[15]}</Text></Text>
                    </View>
                    <View style={styles.rowAlignContainer}>
                        <Text style={styles.dataLabel}>Amp-<Text style={styles.dataText}>{props.matchData[16]}</Text></Text>
                        <Text style={styles.dataLabel}>Amp Misses-<Text style={styles.dataText}>{props.matchData[17]}</Text></Text>
                    </View>
                    <View style={styles.rowAlignContainer}>
                        <Text style={styles.dataLabel}>Climb-<Text style={styles.dataText}>{stageValues[props.matchData[19]]}</Text></Text>
                        <Text style={styles.dataLabel}><Text style={styles.dataText}>{props.matchData[18] == 1 ? "Did" : "Did not"}</Text> trap</Text>
                    </View>
                    <View style={styles.rowAlignContainer}>
                        <Text style={styles.dataLabel}><Text style={styles.dataText}>{props.matchData[20] == 1 ? "Did" : "Did not"}</Text> break</Text>
                        <Text style={styles.dataLabel}><Text style={styles.dataText}>{props.matchData[21] == 1 ? "Did" : "Did not"}</Text> get note stuck</Text>
                    </View>
                    <View style={styles.rowAlignContainer}>
                        <Text style={styles.dataLabel}>Driver Skill-<Text style={styles.dataText}>{props.matchData[22]}</Text></Text>
                    </View>
                </View>

                {/* Comment Subcontainer */}
                <View style={styles.matchDataSubcontainer}>
                    <Text style={{...globalTextStyles.secondaryText, fontSize: 20*fU, color: CS.dark1}}>
                        Comment
                    </Text>
                    <View style={styles.rowAlignContainer}>
                        <Text style={styles.dataLabel}>"{props.matchData[24]}"</Text>
                    </View>
                </View>

            </View>
        );
    }
    // Individual pit data component

    const PitDataBox = (props) => {
    
    if (props.pitData && props.pitData.length > 0)
    {

        return (
            <View key={props.id} style={styles.matchDataContainer}>
                <Text style={{...globalTextStyles.secondaryText, fontSize: 24*fU, color: CS.dark1}}>
                    {props.pitData[1]} {props.pitData[2]} 
                </Text>

                {/* Pit Data */}
                <View style={styles.matchDataSubcontainer}>
                    <Text style={{...globalTextStyles.secondaryText, fontSize: 20*fU, color: CS.dark1}}>
                        Pit Data
                    </Text>

                    <View style={styles.rowAlignContainer}>
                        <Text style={styles.dataLabel}>DriveTrain-<Text style={styles.dataText}>{props.pitData[3]}</Text></Text>
                        <Text style={styles.dataLabel}>Motors-<Text style={styles.dataText}>{props.pitData[4]}</Text></Text>
                    </View>
                    <View style={styles.rowAlignContainer}>
                        <Text style={styles.dataLabel}># Batteries-<Text style={styles.dataText}>{props.pitData[5]}</Text></Text>
                        <Text style={styles.dataLabel}>Weight-<Text style={styles.dataText}>{props.pitData[6]}</Text></Text>
                    </View>
                    <View style={styles.rowAlignContainer}>
                        <Text style={styles.dataLabel}>Language-<Text style={styles.dataText}>{props.pitData[7]}</Text></Text>
                        <Text style={styles.dataLabel}>Paradigm-<Text style={styles.dataText}>{props.pitData[8]}</Text></Text>
                    </View>
                    <View style={styles.rowAlignContainer}>
                        <Text style={styles.dataLabel}>Human Player-<Text style={styles.dataText}>{props.pitData[9]}</Text></Text>
                        <Text style={styles.dataLabel}>EndGame-<Text style={styles.dataText}>{props.pitData[11]}</Text></Text>
                    </View>
                    <View style={styles.rowAlignContainer}>
                        <Text style={styles.dataLabel}>Under Stage-<Text style={styles.dataText}>{props.pitData[10] == 1 ? "Yes" : "No"}</Text></Text>
                        <Text style={styles.dataLabel}>Shooting-<Text style={styles.dataText}>{props.pitData[12]}</Text></Text>
                    </View>
                    <View style={styles.rowAlignContainer}>
                        <Text style={styles.dataLabel}>Overall Ranking-<Text style={styles.dataText}>{props.pitData[13]}</Text></Text>
                    </View>
                </View>

                {/* Comment Subcontainer */}
                <View style={styles.matchDataSubcontainer}>
                    <Text style={{...globalTextStyles.secondaryText, fontSize: 20*fU, color: CS.dark1}}>
                        Comments
                    </Text>
                    <View style={styles.rowAlignContainer}>
                        <Text style={styles.dataLabel}>"{props.pitData[15]}"</Text>
                    </View>
                </View>

                {/* Image subcontainer */}
                <View style={styles.matchDataSubcontainer}>
                    <Text style={{...globalTextStyles.secondaryText, fontSize: 20*fU, color: CS.dark1}}>
                        Images
                    </Text>


            { props.pitData[16].split(",").map((imageName, imageindex) => {
                if (imageName != null && imageName.trim().length > 1) {

                return (
                    <View key={imageindex} style={styles.rowAlignContainer}>
                    
                    <Image
                        style={{ height: 350,width:200}}
                        source={{uri:getImage(imageName, firebaseURL, subpath)}}
                    />
                    
                    </View>
                );
                }
            })}

                </View>
            </View>
        );
        } else {
            return;
        }
    }

    const PerformanceChart = (data, labels) => {

            if (chartLabels.length === 0 || chartData.length === 0) return;

            // Centering this is a remarkable pain
            return (
                <View style={{alignItems: "center", justifyContent: "center", marginTop: 4*vh, marginRight: 4*vw}}>
                    <LineChart
                        data={{
                            labels: chartLabels,
                            datasets: [{
                                data: chartData
                            }],
                        }}
                        width={90*vw}
                        height={70*vw}
                        yAxisInterval={1}
                        segments={Math.min(Math.max(...chartData), 9)}
                        fromZero={true}
                        withOuterLines={false}
                        chartConfig={{
                            backgroundGradientFromOpacity: 0,
                            backgroundGradientToOpacity: 0,
                            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                            decimalPlaces: 0,
                            propsForDots: {
                                r: 1*vh,
                                strokeWidth: 0,
                            },
                            propsForLabels: {
                                fontSize: 8
                            }
                        }}
                        style={{
                        }}
                    />
                </View>
        );
    }

    return (
        <View style={globalContainerStyles.centerContainer}>
            <TTGradient/>

            { checkForDNP() && (
                <View style={styles.warningTopBar}>
                    <Text style={{fontFamily: "LGC Light Italic", color: CS.light2, fontSize: 16*fU, textAlign: "center"}}>
                        A commenter has flagged this team as a <Text style={{fontFamily: "LGC Bold"}}>do not pick</Text> team!
                    </Text>
                </View>
            )}

            <ScrollView>
                {/* General Team Overview */}
                <View style={styles.sectionStyle}>
                    <TTGradient/>
                    <View style={{margin: 1*vh}}/>

                    <Text style={styles.sectionTitle}>
                        Team {route.params.teamNumber} Average
                    </Text>

                    <View style={{...styles.rowAlignContainer, paddingHorizontal: 3*vw}}>
                        <View style={{...styles.centerContainer}}>
                            <Text style={styles.statHeader}>Played</Text>
                            <Text style={globalTextStyles.secondaryText}>{route.params.teamData.length}</Text>
                        </View>
                        <View style={{...styles.columnContainer, alignItems: "center"}}>
                            <Text style={styles.statHeader}>Auto</Text>
                            <Text style={globalTextStyles.secondaryText}>{route.params.teamStatistics.auto}</Text>
                        </View>
                        <View style={{...styles.columnContainer, alignItems: "center"}}>
                            <Text style={styles.statHeader}>Teleop</Text>
                            <Text style={globalTextStyles.secondaryText}>{route.params.teamStatistics.teleop}</Text>
                        </View>
                        <View style={{...styles.columnContainer, alignItems: "center"}}>
                            <Text style={styles.statHeader}>Speaker</Text>
                            <Text style={globalTextStyles.secondaryText}>{route.params.teamStatistics.speaker}</Text>
                        </View>
                        <View style={{...styles.columnContainer, alignItems: "center"}}>
                            <Text style={styles.statHeader}>Amp</Text>
                            <Text style={globalTextStyles.secondaryText}>{route.params.teamStatistics.amp}</Text>
                        </View>
                        <View style={{...styles.columnContainer, alignItems: "center"}}>
                            <Text style={styles.statHeader}>Endgame</Text>
                            <Text style={globalTextStyles.secondaryText}>{route.params.teamStatistics.endgame}</Text>
                        </View>
                    </View>
                    <View style={{margin: 2*vh}}/>
                </View>

                {/* Performance Over Time */}
                <View style={{...styles.sectionStyle, zIndex: 5}}>
                    <TTGradient/>
                    <View style={{margin: 1*vh}}/>

                    <Text style={styles.sectionTitle}>
                        Performance Chart
                    </Text>


                    {   route.params.teamData.length < 3 &&
                        <Text style={{fontFamily: "LGC Light", color: CS.light2, fontSize: 16*fU, textAlign: "center", margin: 2*vh}}>
                            There isn't enough data on this team to make a chart
                        </Text>
                    }
                    {
                        route.params.teamData.length >= 3 &&
                        <View style={{flex: 1, flexDirection: "column", width: "100%", alignItems: "center"}}>
                            <View style={{margin: 1.5*vh}}/>
                            <View style={{...styles.rowAlignContainer, zIndex: 5}}>
                                <Text style={globalTextStyles.labelText}>View graph of...</Text>
                                <TTDropdown 
                                    state={chartValue} 
                                    setState={(value) => {
                                        setChartValue(value);
                                        setChartData(getSpecificData(value));
                                    }} 
                                    items={chartableValues}
                                    boxWidth={50*vw}
                                    boxHeight={6*vh}
                                    boxStyle={globalInputStyles.dropdownInput}
                                    textStyle={globalTextStyles.labelText}
                                    overrideStyle={{margin: 0, alignSelf: "center"}}
                                    zIndex={5}
                                />
                            </View>
                            <PerformanceChart/>
                        </View>
                    }
                    <View style={{margin: 1*vh}}/>

                </View>

                {/* Comments */}
                <View style={styles.sectionStyle}>
                    <TTGradient/>
                    <View style={{margin: 1*vh}}/>

                    <Text style={styles.sectionTitle}>
                        Comments
                    </Text>
                    {route.params.teamData.map((match, index) => {
                        const comment = match[24];
                        if (comment.length !== 0) return (
                            <View key={index}>
                                <Text style={{...globalTextStyles.labelText, margin: 0.5*vh}}>"{comment}"</Text>
                            </View>
                        );
                    })}
                    {route.params.pitData.map((pit, pitindex) => {
                        const comment = pit[15];
                        if (comment.length !== 0) return (
                            <View key={pitindex}>
                                <Text style={{...globalTextStyles.labelText, margin: 0.5*vh}}>"{comment}"</Text>
                            </View>
                        );
                    })}
                    { checkEmptyComments() &&
                        <Text style={{fontFamily: "LGC Light", color: CS.light2, fontSize: 16*fU, textAlign: "center", margin: 2*vh}}>Nobody has commented on this team yet.</Text>
                    }

                    <View style={{margin: 2*vh}}/>
                </View>

                {/* Individual match data */}
                <View style={styles.sectionStyle}>
                    <TTGradient/>
                    <View style={{margin: 1*vh}}/>

                    {route.params.pitData.length > 0 && <Text style={styles.sectionTitle}>Pit Scouting</Text>}

                    {route.params.pitData.map((pit, index) => {
                        return <PitDataBox key={index} id={index} pitData={pit}/>
                    })}
                    

                    <Text style={styles.sectionTitle}>
                        Individual Matches
                    </Text>
                    {route.params.teamData.map((match, index) => {
                        return <MatchDataBox key={index} id={index} matchData={match}/>
                    })}

                    <View style={{margin: 2*vh}}/>
                </View>

            </ScrollView>
        </View>
    );
}

// Probably shouldn't be quite this localized
const styles = StyleSheet.create({
    sectionStyle: {
        ...globalContainerStyles.centerContainer, 
        alignItems: "center", 
        backgroundColor: `${CS.dark1}70`,
    },
    sectionTitle: {
        ...globalTextStyles.primaryText, 
        fontSize: 36*fU
    },
    matchDataContainer: {
        ...globalContainerStyles.columnContainer,
   
        marginHorizontal: 2*vh,
        marginVertical: 1*vh,
        padding: 1*vh,

        backgroundColor: CS.light1,
        borderRadius: 1*vh,
    },
    matchDataSubcontainer: {
        ...globalContainerStyles.columnContainer,
   
        padding: 1*vh,
        margin: 1*vh,
        
        backgroundColor: `${CS.light3}9F`,
        borderRadius: 0.5*vh,
    },
    rowAlignContainer: {
        ...globalContainerStyles.rowContainer, 
        width: "100%", 
        justifyContent: "space-evenly"
    },
    dataText: {
        fontFamily: "LGC Bold",
        fontSize: 12*fU,
    },
    dataLabel: {
        marginVertical: 0.4*vh,

        fontFamily: "LGC Light Italic", // For reasons I cannot explain, setting this to "LGC Light" adds a margin of about 130 to every item using it
        fontSize: 12*fU,
    },
    statHeader: {
        ...globalTextStyles.secondaryText,
        marginTop: 2*vh,
        marginBottom: -1*vh,

        fontSize: 14*fU,
        color: `${CS.light1}9F`
    },
    warningTopBar: {
        alignItems:"center",
        padding: 2*vh,
        zIndex: 10,

        backgroundColor: CS.accent3,
        shadowColor: CS.dark1,
        shadowRadius: 2*vh,
        shadowOpacity: 0.5,
    }
})

// Exports
export default TeamAnalytics;