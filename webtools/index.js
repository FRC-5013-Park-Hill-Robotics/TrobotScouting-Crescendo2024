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
        const teamNumber = data[3];
        if (fileContents[teamNumber] == null) fileContents[teamNumber] = [data];
        else fileContents[teamNumber].push(data);
    }

    // Make a sheet from each team
    const workbook = XLSX.utils.book_new();

    // Constants
    const matchTypeValues = ["Practice", "Qualifiers", "Finals"];
    const teamColorValues = ["Red", "Blue"]
    const deviceValues = ["Blue1","Blue2","Blue3","Red1","Red2","Red3"];

    for (const team of Object.keys(fileContents)) {
        const teamSheet = XLSX.utils.aoa_to_sheet([
            [
                "ScouterName","Device","TeamNumber","MatchNumber","MatchType","AllianceColor",
                "Mobility","AutoDocked","AutoEngaged",
                "AutoCubeHigh","AutoCubeMid","AutoCubeLow","AutoConeHigh","AutoConeMid","AutoConeLow","AutoMisses",
                "TeleCubeHigh","TeleCubeMid","TeleCubeLow","TeleConeHigh","TeleConeMid","TeleConeLow","TeleMisses",
                "EndgameParked","EndgameDocked","EndgameEngaged","EventKey","Comments"            ],
            ...(fileContents[team].map(match => [
                match[0],
                deviceValues[match[1]],
                match[2],
                match[3],
                matchTypeValues[match[4]],
                match[5],
                Number(match[6]) ? true : false,
                Number(match[7]) ? true : false,
                Number(match[8]) ? true : false,
                Number(match[9]),
                Number(match[10]),
                Number(match[11]),
                Number(match[12]),
                Number(match[13]),
                Number(match[14]),
                Number(match[15]),
                Number(match[16]),
                Number(match[17]),
                Number(match[18]),
                Number(match[19]),
                Number(match[20]),
                Number(match[21]),
                Number(match[22]),
                Number(match[23]) ? true : false,
                Number(match[24]) ? true : false,
                Number(match[25]) ? true : false,
                match[26],
                match[27]
            ]))
        ]);

        XLSX.utils.book_append_sheet(workbook, teamSheet, `Team ${team}`);
    }

    XLSX.writeFile(workbook, "CloudData.xlsx");
}
window.downloadDataToXLSX = downloadDataToXLSX;