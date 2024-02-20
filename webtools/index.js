// This took an UNFATHOMABLY LONG TIME to get set up
import CryptoJS from 'crypto-js';
import QRCode from  'qrcode';

import Bluebird from 'bluebird';
import * as XLSX from "xlsx";
import { initializeApp, getApp, getApps, deleteApp } from "firebase/app";
import { getStorage, ref, uploadBytes, listAll, getBlob } from "firebase/storage";

const generateQRFromData = () => {
    // Canvas and QRText
    const canvas = document.getElementById("QRcanvas");
    const qrText = document.getElementById("QRtext");
    const width = canvas.clientWidth;

    // Getting inputs
    const bucketName = document.getElementById("QRbucketName").value;
    const bucketCloudConfig = document.getElementById("QRcloudConfig").value;
    const bucketSubpath = document.getElementById("QRsubpath").value;
    const bucketPermissions = document.getElementById("QReditorPermissions").checked ? "editor" : "reader";
    const bucketPassword = document.getElementById("QRpassword").value;

    // Cleanup for the cloud config
    let cleanedConfig = bucketCloudConfig.slice(
        bucketCloudConfig.indexOf("{"),
        bucketCloudConfig.indexOf("}") + 1,
    );
    // Regex wizardry https://stackoverflow.com/questions/9637517
    cleanedConfig = cleanedConfig
        .replace(/:\s*"([^"]*)"/g, function(match, p1) {
            return ': "' + p1.replace(/:/g, '@colon@') + '"';
        })
        .replace(/:\s*'([^']*)'/g, function(match, p1) {
            return ': "' + p1.replace(/:/g, '@colon@') + '"';
        })
        .replace(/(['"])?([a-z0-9A-Z_]+)(['"])?\s*:/g, '"$2": ')
        .replace(/@colon@/g, ':');

    // Error bar
    const errorBar = document.getElementById("QRerror");
    if (errorBar.style.transform != "scaleY(0)") {
        errorBar.style.transform = "scaleY(0)";
    }
    const showError = (message) => {
        errorBar.children[0].innerHTML = message;
        errorBar.style.transform = "scaleY(1)"
    }

    // Error checking
    if (bucketName.length === 0) {
        showError("Your bucket needs a name.");
        return;
    };
    if (bucketCloudConfig.length === 0) {
        showError("You need to fill in the cloud configuration.");
        return;
    }
    else {
        try {
            const jsonData = JSON.parse(cleanedConfig);
            const requiredKeys = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"];
            if (JSON.stringify(Object.keys(jsonData)) !== JSON.stringify(requiredKeys)) {
                showError("Your cloud configuration doesn't contain the required values.");
                return;
            };
        } catch (e) {
            showError(`There was an error parsing your cloud config:\n\n${e}`);
            return;
        }
    }
    if (bucketPassword.length === 0) {
        showError("Your bucket needs a password.");
        return;
    };

    const bucketSettings = {
        bucketName: bucketName,
        cloudConfig: JSON.parse(cleanedConfig),
        subpath: bucketSubpath,
        permissions: bucketPermissions
    };

    // Generate codes
    const bucketCode = CryptoJS.AES.encrypt(JSON.stringify(bucketSettings), bucketPassword).toString();
    QRCode.toCanvas(
        canvas, 
        bucketCode,
        {
            width: width,
            errorCorrectionLevel: "M"
        }, 
        (e) => {
            if (e) console.error(e);
        }
    );
    qrText.innerHTML = bucketCode;

    // Download
    const qrDownload = document.getElementById("QRdownload");
    QRCode.toDataURL(
        bucketCode,
        {
            width: 2000,
            height: 2000,
            errorCorrectionLevel: "M"
        }, 
        (e, url) => {
            if (e) {
                console.error(e);
                return;
            }
            qrDownload.style.display = "block";
            qrDownload.href = url;
        }
    );
    
    return;
}
window.generateQRFromData = generateQRFromData;


const generateTbaQRFromData = () => {
    // Canvas and QRText
    const canvas = document.getElementById("QRcanvas2");
    const QRText = document.getElementById("QRtext2");
    const width = canvas.clientWidth;

    // Getting inputs
    const tbaKey = document.getElementById("TBAkey").value;
    const tbaEventKey = document.getElementById("TBAEventKey").value;
    const qrPassword = document.getElementById("TBApassword").value;
    

    // Error checking
    if (tbaKey.length === 0) {
        showError("Please enter TBA Key.");
        return;
    };
    if (tbaEventKey.length === 0) {
        showError("You need to enter the Event Key.");
        return;
    }

    if (qrPassword.length === 0) {
        showError("You need a password.");
        return;
    };

    const tbaSettings = {
        tbaKey: tbaKey,
        tbaEventKey: tbaEventKey
    };

    // Generate codes
    const tbaCode = CryptoJS.AES.encrypt(JSON.stringify(tbaSettings), qrPassword).toString();
    QRCode.toCanvas(
        canvas, 
        tbaCode,
        {
            width: width,
            errorCorrectionLevel: "M"
        }, 
        (e) => {
            if (e) console.error(e);
        }
    );
    QRText.innerHTML = tbaCode;

    // Download
    const qrDownload2 = document.getElementById("QRdownload2");
    QRCode.toDataURL(
        tbaCode,
        {
            width: 2000,
            height: 2000,
            errorCorrectionLevel: "M"
        }, 
        (e, url) => {
            if (e) {
                console.error(e);
                return;
            }
            qrDownload2.style.display = "block";
            qrDownload2.href = url;
        }
    );
    
    return;
}
window.generateTbaQRFromData = generateTbaQRFromData;

const downloadDataToXLSX = async () => {
    const bucketCloudConfig = document.getElementById("XLSXcloudConfig").value;
    const bucketSubpath = document.getElementById("XLSXsubpath").value;

    // Error bar
    const errorBar = document.getElementById("XLSXerror");
    if (errorBar.style.transform != "scaleY(0)") {
        errorBar.style.transform = "scaleY(0)";
    }
    const showError = (message) => {
        errorBar.children[0].innerHTML = message;
        errorBar.style.transform = "scaleY(1)"
    }

    // Cleanup for the cloud config
    let cleanedConfig = bucketCloudConfig.slice(
        bucketCloudConfig.indexOf("{"),
        bucketCloudConfig.indexOf("}") + 1,
    );
    // Regex wizardry https://stackoverflow.com/questions/9637517
    cleanedConfig = cleanedConfig
        .replace(/:\s*"([^"]*)"/g, function(match, p1) {
            return ': "' + p1.replace(/:/g, '@colon@') + '"';
        })
        .replace(/:\s*'([^']*)'/g, function(match, p1) {
            return ': "' + p1.replace(/:/g, '@colon@') + '"';
        })
        .replace(/(['"])?([a-z0-9A-Z_]+)(['"])?\s*:/g, '"$2": ')
        .replace(/@colon@/g, ':');
    if (bucketCloudConfig.length === 0) {
        showError("You need to fill in the cloud configuration.");
        return;
    }
    else {
        try {
            const jsonData = JSON.parse(cleanedConfig);
            const requiredKeys = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"];
            if (JSON.stringify(Object.keys(jsonData)) !== JSON.stringify(requiredKeys)) {
                showError("Your cloud configuration doesn't contain the required values.");
                return;
            };
        } catch (e) {
            showError(`There was an error parsing your cloud config:\n\n${e}`);
            return;
        }
    }

    const firebaseConfig = JSON.parse(cleanedConfig);

    if (getApps().length !== 0) deleteApp(getApp());
    const app = initializeApp(firebaseConfig);
    const storage = getStorage();

    const storageRef = ref(storage, bucketSubpath);
    const allFiles = (await listAll(storageRef)).items;
    if (allFiles.length === 0) {
        showError(`No files in subpath "${bucketSubpath}"`);
        return;
    }

    // Preliminary check somewhat
    storage.maxOperationRetryTime = 5000; // Decrease to see if theres an error
    try {
        await getBlob(ref(storage, allFiles[0].fullPath));
    } catch {
        showError("Failed to download files because CORS configuration has not been set");
        return;
    }

    // Download everything
    storage.maxOperationRetryTime = 120000; // Revert back to original
    const fileStringData = async (file) => {
        const storageRef = ref(storage, file.fullPath);
        const fileBlob = await getBlob(storageRef);
        return await new Response(fileBlob).text();
    }
    const allFileData = await Bluebird.Promise.map(allFiles, 
        (file) => {
            return fileStringData(file);
        }, 
        {concurrency: 250}
    );

    // Split
    const delimiter = String.fromCharCode(124);
    const deserializeData = (data) => {    
        return data.split(delimiter);
    };

    // Downloading into an organized object
    const fileContents = {};
    for (const stringData of allFileData) {

        const data = deserializeData(stringData);
        const eventNumber = data[0];

        if (fileContents[eventNumber] == null) fileContents[eventNumber] = [data];
        else fileContents[eventNumber].push(data);
    }

    try {
        // Make a sheet from each team
        const workbook = XLSX.utils.book_new();

        // Constants
        const matchTypeValues = ["Practice", "Qualifiers", "Finals"];
        const deviceValues = ["Blue1","Blue2","Blue3","Red1","Red2","Red3"];
        const stageValues = ["None","Park","Onstage","Onstage Buddy"];

        for (const dataType of Object.keys(fileContents)) {
            if(dataType == "Match") {
                const Sheet = XLSX.utils.aoa_to_sheet([
                    ["DataType","ScouterName","Device","TeamNumber","MatchNumber","MatchType","AllianceColor",
                        "Leave","CenterlineNoteScored",
                        "AutoSpeaker","AutoSpeakerMiss","AutoAmp","AutoAmpMiss",
                        "TeleSpeaker","TeleSpeakerMiss","TeleAmpifiedSpeaker","TeleAmp","TeleAmpMiss",
                        "Trap","Stage/Climb","Broke","NoteStuck","DriverSkill","EventKey","Comments"],
                    ...(fileContents[dataType].map(match => [
                        match[0],
                        match[1],
                        deviceValues[match[2]],
                        match[3],
                        match[4],
                        matchTypeValues[match[5]],
                        match[6],
                        Number(match[7]) ? true : false, //Leave
                        Number(match[8]) ? true : false, //CemterlineNoteScored
                        Number(match[9]), //AutoSpeaker
                        Number(match[10]), //AutoSpeakerMiss
                        Number(match[11]), //AutoAmp
                        Number(match[12]), //AutoAmpMiss
                        Number(match[13]), //TeleSpeaker
                        Number(match[14]), //TeleAmplifiedSpeaker
                        Number(match[15]), //TeleSpeakerMiss
                        Number(match[16]), //TeleAmp
                        Number(match[17]), //TeleAmpMiss
                        Number(match[18]), //Trap
                        stageValues[match[19]], //Stage/Climb
                        Number(match[20]), //Broke
                        Number(match[21]), //Note Stuck
                        Number(match[22]), //DriverSkill
                        match[23], //EventKey
                        match[24] //comment
                    ]))
                ]);

                XLSX.utils.book_append_sheet(workbook, Sheet, dataType);
            }
            if(dataType == "Pit") {
                const pitSheet = XLSX.utils.aoa_to_sheet([
                    ["DataType","ScouterName","TeamNumber",
                    "DriveTrain","Motor","Batteries","weight",
                    "Language","CodeParadigm","HumanPlayer",
                    "UnderStage","Stage/Climb","ShootingLocations","OverallStatus",
                    "EventKey","Comments","Photos"],
                    ...(fileContents[dataType].map(pit => [
                        pit[0], //DataType
                        pit[1], //ScouterName
                        pit[2], //TeamNumber
                        pit[3], //DriveTrain
                        pit[4], //Motor
                        pit[5], //Batteries
                        pit[6], //Weight
                        pit[7], //Language
                        pit[8], //CodeParadigm
                        pit[9], //HumanPlayer
                        pit[10], //UnderStage
                        pit[11], //StageClimb
                        pit[12], //ShootingLocations
                        pit[13], //OverallStatus
                        pit[14], //eventkey
                        pit[15], //comment
                        pit[16] //photos
                    ]))
                ]);

                XLSX.utils.book_append_sheet(workbook, pitSheet, dataType);
            }
        }

        XLSX.writeFile(workbook, "CloudData.xlsx");
    } catch(e) {
        showError(e);
    }
}
window.downloadDataToXLSX = downloadDataToXLSX;