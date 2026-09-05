console.log("Lets write JavaScript");

// supabase URLs
const SUPABASE_URL = "https://dnzrnfaflaqolqffkzfh.supabase.co";
const SUPABASE_STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/songs`;
const SUPABASE_KEY = "sb_publishable_pZfYk7kyn6VAY53lzslOcA_xUq05zeN";

// global variables
let songs;
let currentIndex = 0;
let currentTrack = "";
let currentPlaylist = "";
let pendingSeek = null;

// seconds to minutes time format converter
function formatTime(seconds) {
    let minutes = Math.floor(seconds / 60);
    let secs = Math.floor(seconds % 60);

    if (secs < 10) {
        secs = "0" + secs;
    }
    return `${minutes}:${secs}`;
}

async function getSongs(folder) {

    // Decode the folder first because it may already contain %20
    folder = decodeURIComponent(folder);

    // Remove "songs/" from the beginning
    folder = folder.replace(/^songs[\\/]/, "");

    // Fetch info.json from Supabase
    const infoResponse = await fetch(
        `${SUPABASE_STORAGE_URL}/${encodeURIComponent(folder)}/info.json`
    );

    if (!infoResponse.ok) {
        throw new Error(`Could not load info.json: ${infoResponse.status}`);
    }

    const info = await infoResponse.json();

    songs = [];

    // Create URLs for all songs
    for (const song of info.songs) {

        const songURL =
            `${SUPABASE_STORAGE_URL}/${encodeURIComponent(folder)}/${encodeURIComponent(song.file)}`;

        songs.push(songURL);
    }

    // Location where song list will be displayed
    let songUL = document
        .querySelector(".songList")
        .getElementsByTagName("ul")[0];

    songUL.innerHTML = "";

    // Create song list
    for (const song of songs) {

        if (!song) {
            continue;
        }

        // Get filename from URL
        let songName = decodeURIComponent(
            song.split("/").pop()
        );

        // Find matching song in info.json
        const songData = info.songs.find(
            item => item.file === songName
        );

        // Song cover
        let songCover = songData.cover
            ? `${SUPABASE_STORAGE_URL}/${encodeURIComponent(folder)}/${encodeURIComponent(songData.cover)}`
            : `${SUPABASE_STORAGE_URL}/${encodeURIComponent(folder)}/cover.jpg`;

        songUL.innerHTML += `
            <li data-song="${song}">

                <div class="cover-box">
                    <img
                        class="song-cover"
                        src="${songCover}"
                        onerror="this.onerror=null; this.src='img/music.svg'; this.classList.add('invert');">
                </div>

                <div class="info">
                    <div>${songData.name}</div>
                    <div>${songData.artist}</div>
                </div>

                <div class="playNow">
                    <img
                        class="list-btn"
                        style="height: 34px;"
                        src="img/list-play.svg"
                        alt="button">
                </div>

                <div class="music-visualizer">
                    <img src="img/level.svg" alt="">
                </div>

            </li>`;
    }

    return songs;
}

// this is for playmusic function that is used in click and the conditon checks only one music play and if current is clicked then continue music without agaun starting.

// also Audio is JS inbuilt audio object to play music.

// let new audio = new Audio the first audio is variable you can take any name.
let currentSong = new Audio;

const playMusic = (track) => {

    currentTrack = track
    currentSong.src = track
    currentSong.play().catch(error => {
        if (error.name !== "AbortError") {
            console.error(error);
        }
    });

    // Main playbar button
    play.src = "img/pause.svg";

    // resst all the play button of card and make the clicked playlist card button pause
    document.querySelectorAll(".play-btn .card-play-icon").forEach(icon => {
        icon.innerHTML = `<circle cx="28" cy="28" r="28" fill="#1ED760" />
                        <path d="M23 18.5L39 28L23 37.5V18.5Z" fill="black" />`
    })

    // reset all song-list buttons 
    document.querySelectorAll(".list-btn").forEach(button => {
        button.src = "img/list-play.svg"
    })

    // find the current song
    let currentLi = document.querySelector(`li[data-song="${track}"]`);

    // change the button to pause
    if (currentLi) {
        currentLi.querySelector(".list-btn").src = "img/list-pause.svg"
        const cover = currentLi.querySelector(".song-cover");

        updateBackground(cover.src);
    }

    // Hide all card play button
    const previousCardButton = document.querySelector(".playing");
    if (previousCardButton) {
        previousCardButton.classList.remove("playing");
    }

    // Hide all playing indicators
    document.querySelectorAll(".music-visualizer").forEach(indicator => {
        indicator.style.display = "none";
    });

    // updating the current song name in the playbar
    let songName = currentLi.querySelector(".info > div").innerHTML;
    document.querySelector(".songinfo").innerHTML = songName;

    // Reset seekbar because a new song started
    seekbar.value = 0;
    seekbar.style.setProperty("--progress", "0%");
    seekbar.style.setProperty("--hover-progress", "0%");

    document.querySelector(".currentTime").textContent = "0:00";
}

async function displayAlbums() {

    try {

        const response = await fetch(
            `${SUPABASE_URL}/storage/v1/object/list/songs`,
            {
                method: "POST",
                headers: {
                    apikey: SUPABASE_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    prefix: "",
                    limit: 100,
                    sortBy: {
                        column: "name",
                        order: "asc"
                    }
                })
            }
        );


        if (!response.ok) {
            const error = await response.text();
            console.error("Supabase error:", error);
            return;
        }

        const items = await response.json();

        const cardContainer =
            document.querySelector(".cardContainer");

        cardContainer.innerHTML = "";

        for (const item of items) {

            // Folder
            if (item.id === null) {

                const folder = item.name;

                const infoResponse = await fetch(
                    `${SUPABASE_STORAGE_URL}/${encodeURIComponent(folder)}/info.json`
                );

                if (!infoResponse.ok) {
                    console.error(
                        `Could not load info.json for ${folder}`
                    );
                    continue;
                }

                const info = await infoResponse.json();

                const cover = info.cover
                    ? `${SUPABASE_STORAGE_URL}/${encodeURIComponent(folder)}/${encodeURIComponent(info.cover)}`
                    : `${SUPABASE_STORAGE_URL}/${encodeURIComponent(folder)}/cover.jpg`;

                // YOUR EXISTING CARD
                cardContainer.innerHTML += `
                    <div data-folder="${folder}" class="card">

                        <div class="play">

                            <button class="play-btn">

                                <svg class="card-play-icon"
                                     width="56"
                                     height="56"
                                     viewBox="0 0 56 56"
                                     fill="none">

                                    <circle
                                        cx="28"
                                        cy="28"
                                        r="28"
                                        fill="#1ED760"
                                    />

                                    <path
                                        d="M23 18.5L39 28L23 37.5V18.5Z"
                                        fill="black"
                                    />

                                </svg>

                            </button>

                            <img src="${cover}">

                        </div>

                        <h3>${info.title}</h3>

                        <p>${info.description}</p>

                    </div>
                `;
            }
        }

    } catch (error) {

        console.error("displayAlbums error:", error);

    }
}

function getImageColor(imageSrc) {
    return new Promise((resolve) => {

        const img = new Image();

        // Allow cross-origin image access
        img.crossOrigin = "anonymous";

        img.onload = () => {

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            canvas.width = img.width;
            canvas.height = img.height;

            ctx.drawImage(img, 0, 0);

            try {

                const imageData = ctx.getImageData(
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                let r = 0;
                let g = 0;
                let b = 0;

                const pixels = imageData.data;

                for (let i = 0; i < pixels.length; i += 4) {
                    r += pixels[i];
                    g += pixels[i + 1];
                    b += pixels[i + 2];
                }

                const pixelCount = pixels.length / 4;

                r = Math.floor(r / pixelCount);
                g = Math.floor(g / pixelCount);
                b = Math.floor(b / pixelCount);

                resolve(`rgb(${r}, ${g}, ${b})`);

            } catch (error) {

                console.error("Could not read image color:", error);

                // Fallback color
                resolve("rgb(18, 18, 18)");
            }
        };

        img.onerror = () => {
            console.error("Could not load image:", imageSrc);

            // Fallback color
            resolve("rgb(18, 18, 18)");
        };

        img.src = imageSrc;
    });
}


function getSafeColor(r, g, b) {
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    if (brightness > 120) {
        const factor = 120 / brightness;

        r = Math.floor(r * factor);
        g = Math.floor(g * factor);
        b = Math.floor(b * factor);
    }

    return `rgb(${r}, ${g}, ${b})`;
}


let showingAfter = false;

async function updateBackground(coverSrc) {
    const color = await getImageColor(coverSrc);
    const right = document.querySelector(".right");

    if (showingAfter) {
        right.style.setProperty("--color-before", color);
    } else {
        right.style.setProperty("--color-after", color);
    }

    // Force browser to notice the new background
    void right.offsetWidth;

    right.classList.toggle("show-after");

    showingAfter = !showingAfter;
}

async function main() {

    // display all the albums on the page 
    displayAlbums();

    // attach a event listner to play and pause the song
    function togglePlay() {

        if (!currentTrack) return;

        if (currentSong.paused) {
            currentSong.play();
        }

        else {
            currentSong.pause();
        }
    }

    // play pause song by spacebar
    play.addEventListener("click", togglePlay);

    document.addEventListener("keydown", (e) => {
        e.preventDefault(); // this prevent the default action

        if (e.code === "Space") {
            togglePlay();
        }

        if (e.code === "ArrowRight") {
            nextSong();
        }

        if (e.code === "ArrowLeft") {
            previousSong();
        }
    })

    // funtion for next and previous

    function nextSong() {
        if (!currentTrack) return;

        currentIndex++

        if (currentIndex >= songs.length) {
            currentIndex = 0;
        }
        playMusic(songs[currentIndex]);
    }

    function previousSong() {
        if (!currentTrack) return;

        currentIndex--

        if (currentIndex < 0) {
            currentIndex = songs.length - 1;
        }
        playMusic(songs[currentIndex]);
    }

    // Windows / Chrome media controls
    navigator.mediaSession.setActionHandler("nexttrack", () => {
        nextSong();
    });

    navigator.mediaSession.setActionHandler("previoustrack", () => {
        previousSong();
    });

    let next = document.querySelector("#next");
    let prev = document.querySelector("#previous");

    // adding eventListner
    next.addEventListener("click", nextSong)
    prev.addEventListener("click", previousSong)


    // timeupdate like click event, I mean timeupdate is built-in browser event for audio/video elements.
    /** @type {HTMLInputElement} */
    let seekbar = document.querySelector("#seekbar");

    currentSong.addEventListener("timeupdate", () => {
        let currentTime = currentSong.currentTime;
        let duration = currentSong.duration;

        if (!isNaN(currentSong.duration)) {

            document.querySelector(".currentTime").innerHTML = formatTime(currentTime)
            document.querySelector(".duration").innerHTML = formatTime(duration)

            // this just for moving the seekbar dot by taking the updated time
            seekbar.value = (currentTime / duration) * 100;

            seekbar.style.setProperty("--progress", `${seekbar.value}%`);
        }
    })

    // this for controlling the song by seekbar
    seekbar.addEventListener("input", () => {

        if (!currentTrack) return;

        const duration = currentSong.duration;

        if (!isNaN(duration) && duration > 0) {
            currentSong.currentTime =
                (seekbar.value / 100) * duration;

        } else {
            pendingSeek = Number(seekbar.value);
        }
    });

    // this remember the seekbar drag when song is loading and jump there
    currentSong.addEventListener("loadedmetadata", () => {

        if (pendingSeek !== null) {

            currentSong.currentTime =
                (pendingSeek / 100) * currentSong.duration;

            pendingSeek = null;
        }
    });

    // this part is for mouse hover color changing of the seekbar
    seekbar.addEventListener("mousemove", (e) => {

        let rect = seekbar.getBoundingClientRect();

        let hoverProgress =
            ((e.clientX - rect.left) / rect.width) * 100;

        if (hoverProgress < 0) {
            hoverProgress = 0;
        }

        if (hoverProgress > 100) {
            hoverProgress = 100;
        }

        seekbar.style.setProperty(
            "--hover-progress",
            `${hoverProgress}%`
        );
    });

    seekbar.addEventListener("mouseleave", () => {

        seekbar.style.setProperty(
            "--hover-progress",
            `${seekbar.value}%`
        );

    });

    // add an event listener for hamburger
    let left = document.querySelector(".left")
    document.querySelector("#hamburger").addEventListener("click", () => {
        left.classList.toggle("open");
    })

    // add event listener to close symbol
    document.querySelector("#close").addEventListener("click", () => {
        left.classList.toggle("open");
    })


    // this is for scroll bar in songlist to do auto hide
    let songList = document.querySelector(".songList");

    let scrollTimer;

    songList.addEventListener("scroll", () => {

        songList.classList.add("scrolling");

        clearTimeout(scrollTimer);

        scrollTimer = setTimeout(() => {
            songList.classList.remove("scrolling");
        }, 500);
    });



    // volume bar control code 
    let volume = document.querySelector("#volume");

    currentSong.volume = 0.5;
    volume.value = 50;

    volume.style.setProperty(
        "--progress",
        "50%"
    );

    volume.style.setProperty(
        "--hover-progress",
        "50%"
    );

    // volume seekbar control
    volume.addEventListener("input", () => {

        // If muted, changing the slider will unmute
        if (currentSong.muted) {
            currentSong.muted = false;
        }

        // set the actual volume
        currentSong.volume = volume.value / 100;

        // update the progress
        volume.style.setProperty(
            "--progress",
            `${volume.value}%`
        );

        volume.style.setProperty(
            "--hover-progress",
            `${volume.value}%`
        );

        // Update icon AFTER everything has changed
        updateVolumeIcon();
        updateVolumeTooltip();
    });

    volume.addEventListener("mousemove", (e) => {

        let rect = volume.getBoundingClientRect();

        let hoverProgress =
            ((e.clientX - rect.left) / rect.width) * 100;

        if (hoverProgress < 0) {
            hoverProgress = 0;
        }

        if (hoverProgress > 100) {
            hoverProgress = 100;
        }

        volume.style.setProperty(
            "--hover-progress",
            `${hoverProgress}%`
        );
    });

    volume.addEventListener("mouseleave", () => {

        volume.style.setProperty(
            "--hover-progress",
            `${volume.value}%`
        );
    });

    // mute and unmute button control

    // Volume saved before muting
    let lastVolume = 100;

    // Volume to use when the user is at 0%
    // and clicks the volume icon
    let minVolume = 1;

    let volumeIcon = document.querySelector("#volumeIcon");
    volumeIcon.addEventListener("click", () => {
        if (currentSong.muted) {

            // unmute
            currentSong.muted = false;

            volume.value = lastVolume;
            currentSong.volume = lastVolume / 100;

            volume.style.setProperty(
                "--progress",
                `${lastVolume}%`
            );

            volume.style.setProperty(
                "--hover-progress",
                `${lastVolume}%`
            );

            updateVolumeIcon();
        }

        else {
            // If volume is already 0,
            // clicking the icon should bring
            // the volume back slightly
            if (currentSong.volume == 0) {

                volume.value = minVolume;
                currentSong.volume = minVolume / 100;
                currentSong.muted = false;

                volume.style.setProperty(
                    "--progress",
                    `${minVolume}%`
                );

                volume.style.setProperty(
                    "--hover-progress",
                    `${minVolume}%`
                );

                updateVolumeIcon();
            }
            else {
                lastVolume = volume.value;
                // mute
                currentSong.muted = true;
                volume.value = 0;

                volume.style.setProperty(
                    "--progress",
                    "0%"
                );

                volume.style.setProperty(
                    "--hover-progress",
                    "0%"
                );

                updateVolumeIcon();
            }
        }

    })

    function updateVolumeIcon() {
        if (currentSong.muted || volume.value == 0) {
            volumeIcon.src = "img/mute.svg";
        }
        else if (volume.value <= 33) {
            volumeIcon.src = "img/low-volume.svg";
        }
        else if (volume.value <= 66) {
            volumeIcon.src = "img/medium-volume.svg";
        }
        else {
            volumeIcon.src = "img/high-volume.svg";
        }
    }

    // volume tool tip
    let volumeTooltip = document.querySelector("#volumeTooltip");

    function updateVolumeTooltip() {

        let percent = Number(volume.value);

        let rect = volume.getBoundingClientRect();

        // Width of the slider thumb
        let thumbWidth = 14;

        // Usable width between thumb centers
        let usableWidth = rect.width - thumbWidth;

        // Position of thumb center
        let position =
            (thumbWidth / 2) +
            (percent / 100) * usableWidth;

        volumeTooltip.style.left = `${position}px`;

        volumeTooltip.textContent = `${percent}%`;
    }

    updateVolumeTooltip()


    // load the playlist whenever the card is clicked and this code is for dynamically generated card from JS
    document.querySelector(".cardContainer").addEventListener("click", async (event) => {
        const playButton = event.target.closest(".play-btn")

        if (!playButton) {
            return;
        }

        const card = playButton.closest(".card")
        const folder = card.dataset.folder;

        // Same playlist → play / pause
        if (currentPlaylist === folder) {

            if (currentSong.paused) {
                currentSong.play();
            }
            else {
                currentSong.pause();
            }

            return;
        }

        // New playlist
        currentPlaylist = folder;
        songs = await getSongs(`songs/${folder}`);
        currentIndex = 0;

        playMusic(songs[currentIndex])
    })

    // reset the playbar all elements when song is over
    currentSong.addEventListener("ended", () => {

        // move to the next song 
        currentIndex++;

        if (currentIndex < songs.length) {
            playMusic(songs[currentIndex])
        }

        else {
            play.src = "img/play.svg"
        }
    })


    // adding event listener to library list song
    document.querySelector(".songList > ul").addEventListener("click", (event) => {
        const button = event.target.closest(".list-btn");

        if (!button) {
            return;
        }

        const li = button.closest("li");
        const track = li.dataset.song;

        if (currentTrack === track) {
            if (currentSong.paused) {
                currentSong.play();
            }

            else {
                currentSong.pause();
            }
        }

        else {
            currentIndex = songs.indexOf(track);
            playMusic(track);
        }

    })

    // to make all icon update of the list with song playing
    currentSong.addEventListener("play", () => {

        // Main playbar
        play.src = "img/pause.svg";

        // playlist button
        const currentLi = document.querySelector(`li[data-song="${currentTrack}"]`);

        if (currentLi) {

            // Change play button to pause
            currentLi.querySelector(".list-btn").src = "img/list-pause.svg"

            // Show playing indicator
            currentLi.querySelector(".music-visualizer").style.display =
                "flex";
        }

        // card button
        const currentCard = document.querySelector(
            `.card[data-folder="${currentPlaylist}"]`
        );

        if (currentCard) {
            currentCard.querySelector(".card-play-icon").innerHTML = `
                <circle cx="28" cy="28" r="28" fill="#1ED760" />
                <rect x="21" y="18.5" width="5" height="19" fill="black" />
                <rect x="30" y="18.5" width="5" height="19" fill="black" />
            `;

            // then show new button on the new card
            currentCard.querySelector(".play-btn").classList.add("playing");
        }
    })

    currentSong.addEventListener("pause", () => {

        // Main playbar
        play.src = "img/play.svg";

        // playlist button
        const currentLi = document.querySelector(`li[data-song="${currentTrack}"]`);

        if (currentLi) {

            // Change button to play
            currentLi.querySelector(".list-btn").src = "img/list-play.svg";

            // Hide playing indicator
            currentLi.querySelector(".music-visualizer").style.display =
                "none";

        }

        // card button
        const currentCard = document.querySelector(
            `.card[data-folder="${currentPlaylist}"]`
        );

        if (currentCard) {
            currentCard.querySelector(".card-play-icon").innerHTML = `
                <circle cx="28" cy="28" r="28" fill="#1ED760" />
                <path d="M23 18.5L39 28L23 37.5V18.5Z" fill="black" />
            `;

            currentCard.querySelector(".play-btn").classList.remove("playing");
        }
    })


}


main()