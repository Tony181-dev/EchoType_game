"use strict";
(function () {
  const voices = {
    sonia: {
      name: "Sonia",
      label: "Sonia · nữ · Anh",
      voice: "en-GB-SoniaNeural",
    },
    ryan: {
      name: "Ryan",
      label: "Ryan · nam · Anh",
      voice: "en-GB-RyanNeural",
    },
    jenny: {
      name: "Jenny",
      label: "Jenny · nữ · Mỹ",
      voice: "en-US-JennyNeural",
    },
    guy: { name: "Guy", label: "Guy · nam · Mỹ", voice: "en-US-GuyNeural" },
    natasha: {
      name: "Natasha",
      label: "Natasha · nữ · Úc",
      voice: "en-AU-NatashaNeural",
    },
    william: {
      name: "William",
      label: "William · nam · Úc",
      voice: "en-AU-WilliamMultilingualNeural",
    },
    molly: {
      name: "Molly",
      label: "Molly · nữ · New Zealand",
      voice: "en-NZ-MollyNeural",
    },
  };
  const pending = new Map();
  function ensure(key) {
    if (!voices[key]) return Promise.reject(new Error("Unknown voice"));
    if (window.EchoVoices?.[key]) return Promise.resolve();
    if (pending.has(key)) return pending.get(key);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `voices/${key}.js`;
      script.onload = () => {
        pending.delete(key);
        if (window.EchoVoices?.[key]) resolve();
        else reject(new Error("Voice bank unavailable"));
      };
      script.onerror = () => {
        pending.delete(key);
        script.remove();
        reject(new Error("Could not load voice"));
      };
      document.head.append(script);
    });
    pending.set(key, promise);
    return promise;
  }
  window.EchoVoiceCatalog = { voices, ensure };
})();
