// Library imports
import LZString from "lz-string";
import { initializeApp, getApp, getApps, deleteApp } from "firebase/app";
import { storage, ref, uploadBytes, uploadBytesResumable, listAll, getBlob, getDownloadURL, putFile } from "firebase/storage";
import { Promise } from "bluebird";

// Component imports
import { loadSettings, delimiter, deserializeData, compressData, decompressData } from './LocalStorage';
import { concurrency } from './Constants';
import { UploadTask } from "expo-file-system";

// Initialize from settings
const initializeFirebaseFromSettings = async () => {
    const settings = await loadSettings();
    if (settings?.cloudConfig !== undefined) {
        // If there isnt already an app, create one
        if (getApps().length === 0) {
            return initializeApp(settings.cloudConfig);
        }
        // If there is an app, reinitialize it if the settings have changed
        else if (JSON.stringify(getApp().options) != JSON.stringify(settings.cloudConfig)) {
            deleteApp(getApp());
            return initializeApp(settings.cloudConfig);
        }
        return getApp();
    } else {
        
        if (getApps().length !== 0) {
            deleteApp(getApp());
        }
    }
    return null;
}

// Uploads a string to the cloud
const uploadStringToCloud = async (storage, stringData, filepath) => {
    // Because of the weird way Firebase stores strings, it is normally much more
    // efficient to upload the default string, uncompressed, than it is to compress
    // it first and then upload it.
    // const compressedData = compressData(stringData);

    const blobUpload = new Blob([stringData], {type: "text/plain"});
    const storageRef = ref(storage, filepath);

    try {
        await uploadBytes(storageRef, blobUpload);
        return true;
    } catch (e) {
        console.error(`Error Uploading File: ${e}`);
        return null;
    }
};
const uploadImage = async (storage, uri, filepath) => {
    const metadata = {
        contentType: 'image/jpeg'
    };

    const storageRef = ref(storage, filepath);

    console.log(uri);
    console.log(filepath);

    try{
        const blob = await new Promise((resolve, reject) => {

            const xhr = new XMLHttpRequest();
            xhr.onload = function () {
            resolve(xhr.response);
            };
            xhr.onerror = function (e) {
            reject(new TypeError("Network request failed"));
            };
            xhr.responseType = "blob";
            xhr.open("GET", uri, true);
            xhr.send(null);
        });
        
        await uploadBytesResumable(storageRef, blob);
    }catch(e){
        console.error(`Error Uploading image: ${e}`);
    }
}

// Uploads multiple strings to the cloud
const uploadMultipleStringsToCloud = async (storage, multiStringData, filepaths) => {
    try {
        // Batch upload them with a concurrency limit
        await Promise.map(multiStringData, 
            (stringData, i) => {
                var filepath = filepaths[i];
                if (filepath.startsWith("/")) {
                    filepath = filepath.substring(1);
                }
                
                if(stringData.startsWith("Pit")){

                    if(stringData.indexOf("file:///") > 0){
                        var removePath = (stringData.substring(stringData.indexOf("file:///"),stringData.indexOf("/Camera/")+8));
                        var finalString = stringData.replaceAll(removePath, "");

                        var files = stringData.split("|")[16];
                    
                        var fileArray = files.split(",");
                        for (var j=0; j < fileArray.length; j++)
                        {
                            var file = fileArray[j];
                            var filename = file.replaceAll(removePath, "");
                            var imagepath = "/" + (filepath.split("/")[0]) +"/Photos/" + filename;
                            
                            uploadImage(storage, file.replaceAll("file:///", "file:/"), imagepath);
                        }
                        stringData = finalString;
                    }

                }
                return uploadStringToCloud(storage, stringData, filepath);
            },
            {concurrency: concurrency}
        );
    } catch(e) {
        console.error(`Error uploading multiple strings:\n${e}`);
        return null;
    }
}

// Reads a string from the cloud
const readStringFromCloud = async (storage, filepath) => {
    const storageRef = ref(storage, filepath);
    try {
        const blob = await getBlob(storageRef);
        const blobResponse = new Response(blob);
        const stringData = await blobResponse.text();
        return stringData;
    } catch (e) {
        console.error(`Error Downloading File: ${e}`);
        return null;
    }
};

// Gets all of the files from a specified subpath
const getAllFilesFromCloud = async (storage, subpath) => {
    const storageRef = ref(storage, subpath);
    const fileHandles = await listAll(storageRef);
    const fileData = fileHandles.items;
    const fileNames = fileData.map(x => x.fullPath)
    
    return fileNames;
}
const downloadImageURL= async (storage, filepath) => {
    const storageRef = ref(storage, filepath);

    console.log(filepath);
    try {
        return await getDownloadURL(storageRef);
    } catch (e) {
        console.error(`Error Downloading File: ${e}`);
        return null;
    }
}

// Downloads the data of all the files from the cloud
const downloadAllFilesFromCloud = async (storage, subpath) => {
    /*
    It is arranged in the following structure
    output = { teamNumber: [matchData1, matchData2] }
    */

    const fileContents = {};
    try {
        const filenames = await getAllFilesFromCloud(storage, subpath);
        
		let filenames2 = filenames.filter((keyName) => {return !keyName.endsWith("Pit.txt")});
        
        // Wait for all promises at the same time
        const promiseData = await Promise.map(filenames2, 
            (filename) => {
                return readStringFromCloud(storage, filename);
            },
            {concurrency: concurrency} // This might need to be messed with
        );
        
		// Need some way of sorting each match array based on match number so that graphs are easier
        for (const stringData of promiseData) {
            const data = deserializeData(stringData);
            
            const teamNumber = data[3];
            // If there's already something there, push the new data, otherwise create an array
            if (fileContents[teamNumber] == null) fileContents[teamNumber] = [data];
            else fileContents[teamNumber].push(data);
        }

    } catch (e) {
        ref.error(`Error getting all files:\n${e}`);
        return null;
    }

    return fileContents;
}


// Downloads the data of all the files from the cloud
const downloadPitFilesFromCloud = async (storage, subpath) => {
    /*
    It is arranged in the following structure
    output = { teamNumber: [matchData1, matchData2] }
    */

    const fileContents = {};
    try {
        const filenames = await getAllFilesFromCloud(storage, subpath);
        
		let filenames2 = filenames.filter((keyName) => {return keyName.endsWith("Pit.txt")});
        
        // Wait for all promises at the same time
        const promiseData = await Promise.map(filenames2, 
            (filename) => {
                return readStringFromCloud(storage, filename);
            },
            {concurrency: concurrency} // This might need to be messed with
        );
        
		// Need some way of sorting each match array based on match number so that graphs are easier
        for (const stringData of promiseData) {
            const data = deserializeData(stringData);
            const teamNumber = data[2];
            // If there's already something there, push the new data, otherwise create an array
            if (fileContents[teamNumber] == null) fileContents[teamNumber] = [data];
            else fileContents[teamNumber].push(data);
        }

    } catch (e) {
        console.error(`Error getting all files:\n${e}`);
        return null;
    }

    return fileContents;
}

export { 
    initializeFirebaseFromSettings, 
    uploadStringToCloud, 
    uploadMultipleStringsToCloud,
    readStringFromCloud, 
    getAllFilesFromCloud,
    downloadAllFilesFromCloud,
    downloadPitFilesFromCloud,
    downloadImageURL,
};