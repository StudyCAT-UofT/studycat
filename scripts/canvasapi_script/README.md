### Command-Line Interface Tool

This tool is intended to allow you to export quiz data from an existing quiz on Quercus and import that data into StudyCAT. To import quiz questions from Quercus, first download the version of the script that matches your computer. If you aren't sure which file to download, see **Which File Do I Download?**
#### Download the Script
To download the script, navigate to the releases section on the right side of the main GitHub page. 
- For Windows:
	- canvasapi-script-windows-x64
- For macOS:
	- canvasapi-script-macos-intel
	- canvasapi-script-macos-arm64
- For Linux:
	- canvasapi-script-linux-x64
#### Which File Do I Download?
- Mac Users
	1. Click the Apple logo () at the top left of your screen
	2. Select **About This Mac**
	3. Under your Mac information, if you see **Processor** followed by **Intel Core**, download the `canvasapi-script-macos-intel` file. If you see **Chip** followed by **Apple M1, M2, M3, etc**., download the `canvasapi-script-macos-arm64` file.
#### Creating a Canvas Access Token
 You will need an access token to run the script. You can create an access token by going to Quercus. In Quercus, click **Account**, then **Settings**, then scroll to **Approved Integrations** and click **New Access Token**. Choose a distinctive name, eg., StudyCAT Token.

> [!WARNING]
> Once your access token is on screen, copy it and save it somewhere secure, as once you exit the window, you will not be able to see this access token again. Do not share this access token with anybody.

#### Running the Script
Once you have the file downloaded onto your computer and you have your Canvas access token, there are 2 ways to export your quiz data.
##### Option 1 - Opening the executable file
You can run the script by double clicking on the file you just downloaded.

> [!IMPORTANT]
> For MacOS users, a window may pop up saying `“canvasapi-script-macos-arm64” Not Opened`. To bypass this, click `Done`, and open your system settings by clicking on the Apple logo () at the top left of your screen and then selecting `System Settings`. On the sidebar, scroll down to `Privacy & Security`, and click on it. Scroll all the way down to `Security`, and next to the message `"canvasapi-script-macos-arm64" was blocked to protect your Mac.`, click `Open Anyway`. Another pop-up saying `Open "canvasapi-script-macos-arm64?` should appear. Click `Open Anyway`. 

> [!IMPORTANT]
> For Windows users, a window may pop up saying `canvasapi-script-windows-x64.exe isn't commonly downloaded.` To bypass this, click the three dots in the bottom right corner, and click `Keep`. A second window may pop up saying `Make sure you trust canvasapi-script-windows-x64.exe before you open it.` Next to the `Delete` button, click the dropdown arrow, and select `Keep Anyway`.

This will open a terminal window. After about 15–30 seconds, you should be prompted to enter your course ID.
Next, you will be prompted to enter your quiz ID. To get both of these, you will need to navigate to the quiz on your browser. 

The browser address should begin with something like this: `https://q.utoronto.ca/courses/121212/quizzes/232323`. 

The course ID is the 6 digits that appear after `/courses/`, and the quiz ID is the 6 digits that appear after `/quizzes/`. So in the URL above, the course ID is 121212 and the quiz ID is 232323. Fill in your course ID, click enter, then fill in your quiz ID, and click enter again.

Then you will see a prompt that asks you for your Canvas Access Token:
```
Canvas Access Token (For security, nothing will be displayed on the screen while you type or paste your token):
```

Paste your Canvas access token and press Enter. Nothing will appear on the screen while you type or paste your access token. This is expected and helps keep your access token secure. 

When the export is complete, you will see a message similar to:
```
Success! Quiz data successfully exported to /Users/JaneDoe/canvas_quiz_518767_export_20260716_154226.csv. 
```

The message includes the location where the CSV file was saved. In the example above, the file was saved in the **JaneDoe** folder inside **Users**. Here you'll find your CSV file named `canvas_quiz_518767_export_20260716_154226.csv`.

You can now upload this CSV file into your StudyCAT course question bank.
##### Option 2 - Running the File Directly from the Terminal
This method runs the script from the Terminal instead of by double-clicking it. You may prefer this option for efficiency's sake if you want to provide the course and quiz IDs when starting the script instead of waiting for the program to prompt you.

On Windows, open the Start Menu, and search for Terminal. On Mac, press Command + Spacebar to open Spotlight Search, and type in Terminal. The terminal should open in your personal folder on your computer.

> [!NOTE]
> The Terminal works inside a folder on your computer. To see which folder it is currently using, type **pwd** and hit enter. If you see something like `/Users/your-username` or `/home/your-username` you are in your personal folder.

If you downloaded the script into your **Downloads** folder, enter the following command:

```
./Downloads/canvasapi_script
```

The `./Downloads/` part tells the Terminal where to find the script. If you saved the script somewhere else, replace `Downloads` with the name of that folder/path. 

The script will then prompt you for your course ID, quiz ID, and canvas access token, which you can get by following the same steps in option 1.

If you prefer to directly provide the course and quiz IDs when starting the script you can do that by running this command then pressing enter: 
```
./Downloads/canvasapi_script --course_id 121212 --quiz_id 232323
```
In the command above, replace `Downloads` with the folder where you saved the script, if it is not in your Downloads folder. Also replace `121212` with your own course ID and replace `232323` with your own quiz ID. After pressing Enter, the script will ask for your Canvas access token. Paste your access token and press Enter again. When the export is complete, you will see a message showing where the CSV file was saved, similar to Option 1. You can then upload that file into StudyCAT.
