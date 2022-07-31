import { useState, useEffect, useRef, useCallback } from "react";
import reactLogo from "./assets/react.svg";
import "./App.css";
import { customProtocol } from "./protocol/protocol";
import { useImmer } from "use-immer";

function App() {
  const videoCanvasRef = useRef(null);
  const subCanvasRef = useRef(null);
  const videoRef = useRef(null);
  const snapshotRef = useRef(null);
  const maxId = useRef(0);
  const stoveIndieImage = useRef(new Image());
  const [title, setTitle] = useImmer("");
  const [bgPaddingW, setBgPaddingW] = useImmer(window.electron.config.paddingW);
  const [bgPaddingH, setBgPaddingH] = useImmer(window.electron.config.paddingH);
  const [bottomSubPadding, setBottomSubPadding] = useImmer(
    window.electron.config.bottomSubP
  );
  const [isStoveL10n, setIsStoveL10n] = useImmer(
    window.electron.config.isStoveL10N
  );
  const [isImageLoaded, setIsImageLoaded] = useImmer(false);
  const [flagDuration, setFlagDuration] = useImmer(
    window.electron.config.flagDuration
  );
  const [curFocusedSub, setCurFocusedSub] = useImmer(null);

  const [isFlagDurationInfinite, setIsFlagDurationInfinite] = useImmer(
    window.electron.config.isFlagDurationInfinite
  );
  // image overlay
  // image position

  const [fontFamily, setFontFamily] = useImmer(
    window.electron.config.fontFamily
  );

  const [fontSize, setFontSize] = useState(window.electron.config.fontSize);
  // const fontSize = useRef(60);
  const [subs, setSubs] = useImmer([]);
  const animationFrameId = useRef(null);

  const drawSubtitle = useCallback(
    (canvas, ctx, sub) => {
      // Setup Font
      ctx.font = `${fontSize}px ${fontFamily}`;

      // Setup what text to display
      const text = sub.translation === "" ? sub.original : sub.translation;

      const textList = text.split(/(\r\n|\r|\n)/).filter((text) => {
        return text.match(/\n/g) === null;
      });

      const bgWidthThreshold = canvas.width * 0.8;

      const finalRenderText = [];

      // Create textList for render
      for (const text of textList) {
        // measure the width of the text
        const splitedText = text.split(" ");
        const renderText = [];

        // if (splitedText.length === 1) renderText.push(splitedText[0]);
        let cursor = 0;
        while (cursor <= splitedText.length - 1) {
          let width = 0;
          let textGroup = "";
          do {
            textGroup += splitedText[cursor];
            let metrics = ctx.measureText(textGroup);
            width = parseFloat(
              metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight
            );
            textGroup += " ";
            cursor++;
          } while (
            width < bgWidthThreshold &&
            cursor <= splitedText.length - 1
          );
          textGroup = textGroup.slice(0, -1);
          renderText.push(textGroup);
        }
        // for each text, draw background
        //
        finalRenderText.push(...renderText);
      }

      for (const [index, text] of finalRenderText.entries()) {
        // Calculate the horizontal length and pos
        const textMetricsForW = ctx.measureText(text);
        const textWidth = parseFloat(
          textMetricsForW.actualBoundingBoxLeft +
            textMetricsForW.actualBoundingBoxRight
        );
        const textPosX = canvas.width * 0.5 - textWidth * 0.5;
        const bgWidth = textWidth + bgPaddingW;
        const bgPosX =
          canvas.width * 0.5 -
          textWidth * 0.5 -
          textMetricsForW.actualBoundingBoxLeft -
          bgPaddingW * 0.5;

        // Calculate the vertical length and pos
        const textMetricsForH = ctx.measureText("Ay안녕하세요pT");
        const basePaddingY = canvas.height - bottomSubPadding;

        const textHeight = parseFloat(
          textMetricsForH.actualBoundingBoxAscent +
            textMetricsForH.actualBoundingBoxDescent
        );
        const bgHeight = textHeight + bgPaddingH;
        const bgPosY =
          basePaddingY -
          bgHeight -
          bgHeight * (finalRenderText.length - 1 - index);
        const textPosY =
          textMetricsForH.actualBoundingBoxAscent +
          bgPaddingH * 0.5 +
          basePaddingY -
          bgHeight -
          bgHeight * (finalRenderText.length - 1 - index);

        // const bgY = basePaddingY - bgPaddingH * 0.5;

        ctx.fillStyle = "#000000";
        ctx.fillRect(bgPosX, bgPosY, bgWidth, bgHeight);

        ctx.fillStyle = "#ffffff";
        ctx.fillText(text, textPosX, textPosY);
      }
    },
    [
      bgPaddingW,
      bgPaddingH,
      bottomSubPadding,
      fontSize,
      subs,
      fontFamily,
      isStoveL10n,
    ]
  );

  useEffect(() => {
    setIsImageLoaded(false);
    stoveIndieImage.current.src = isStoveL10n
      ? "/stove_indie_kr.png"
      : "/stove_indie.png";
    stoveIndieImage.current.onload = () => {
      console.log("loaded");
      setIsImageLoaded(true);
    };
    return () => {};
  }, [isStoveL10n]);

  useEffect(() => {
    const videoCanvas = videoCanvasRef.current;
    const subCanvas = subCanvasRef.current;
    const videoCtx = videoCanvas.getContext("2d");
    const subCtx = subCanvas.getContext("2d");
    if (videoCanvas.current === null || videoCtx === null) return;

    function draw() {
      videoCtx.drawImage(videoRef.current, 0, 0);

      if (
        isImageLoaded &&
        (isFlagDurationInfinite || flagDuration < videoRef.current.currentTime)
      )
        videoCtx.drawImage(stoveIndieImage.current, 0, 0);
      subCtx.clearRect(
        0,
        0,
        subCanvasRef.current.width,
        subCanvasRef.current.height
      );
      if (subs.length > 0) {
        const curSub = subs.filter(
          (sub) =>
            sub.start <= videoRef.current.currentTime &&
            sub.end >= videoRef.current.currentTime
        )[0];

        if (curSub !== undefined) {
          drawSubtitle(subCanvas, subCtx, curSub);
        }
      }

      animationFrameId.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    };
  }, [
    subs,
    bgPaddingH,
    bgPaddingW,
    bottomSubPadding,
    fontSize,
    fontFamily,
    isStoveL10n,
    isImageLoaded,
    flagDuration,
  ]);

  function handleOnTitleChange(ev) {
    let { value } = ev.target;

    setTitle(value);
  }

  function handleOnFontSizeChange(ev) {
    let { value } = ev.target;
    value = parseInt(value);
    setFontSize(value);
  }

  function handleOnFontFamilyChange(ev) {
    let { value } = ev.target;
    setFontFamily(value);
  }

  function handleOnBgPaddingWChange(ev) {
    let { value } = ev.target;
    value = parseInt(value);
    setBgPaddingW(value);
  }

  function handleOnBgPaddingHChange(ev) {
    let { value } = ev.target;
    value = parseInt(value);
    setBgPaddingH(value);
  }

  function handleOnBottomSubPaddingChange(ev) {
    let { value } = ev.target;
    value = parseInt(value);
    setBottomSubPadding(value);
  }

  function handleOnIsStoveL10nChange(ev) {
    let { checked } = ev.target;
    setIsStoveL10n(checked);
  }

  function handleOnFlagDurationChange(ev) {
    let { value } = ev.target;
    value = parseInt(value);
    setFlagDuration(value);
  }

  function handleOnIsFlagDurationInfiniteChange(ev) {
    let { checked } = ev.target;
    setIsFlagDurationInfinite(checked);
  }

  async function handleOnFileOpen() {
    const filePath = await window.electron.openFile();
    videoRef.current.src = `${customProtocol}${filePath}`;
  }

  async function handleOnRender() {
    const canvas = document.createElement("canvas");
    canvas.width = subCanvasRef.current.width;
    canvas.height = subCanvasRef.current.height;
    const ctx = canvas.getContext("2d");

    const subData = await Promise.all(
      subs.map(async (sub) => {
        drawSubtitle(subCanvasRef.current, ctx, sub);

        const blob = await new Promise((resolve) => canvas.toBlob(resolve));
        // snapshotRef.current.src = URL.createObjectURL(blob, {
        //   type: "image/png",
        // });

        const buffer = await blob.arrayBuffer();

        return { buffer: buffer, start: sub.start, end: sub.end };
      })
    );

    window.electron.render({
      title: title,
      isStoveL10N: isStoveL10n,
      flagDuration: flagDuration,
      subData: subData,
    });
  }

  async function handleOnSubExport() {
    window.electron.exportSubtitles({ title: title, subs: subs });
  }

  async function handleOnSubImport() {
    console.log("Importing Subtitles");
    // maxId 고쳐야 한다

    const subs = await window.electron.importSubtitles();
    console.log(subs);
    setSubs(subs);
    maxId.current = subs.length;
  }

  async function handleOnSaveSettings() {
    const settings = {
      paddingW: bgPaddingW,
      paddingH: bgPaddingH,
      bottomSubP: bottomSubPadding,
      isStoveL10N: isStoveL10n,
      flagDuration: flagDuration,
      isFlagDurationInfinite: isFlagDurationInfinite,
      fontFamily: fontFamily,
      fontSize: fontSize,
    };
    window.electron.saveSettings(settings);
  }

  async function handleOnSnapShot() {
    const canvas = videoCanvasRef.current;

    // const buffer = canvas.getContext('2d').getImageData(0,0,500, 500).data.buffer
    // canvas.toDataURL()
    // window.electron.saveImage(buffer)

    const blob = await new Promise((resolve) => canvas.toBlob(resolve));
    snapshotRef.current.src = URL.createObjectURL(blob, { type: "image/png" });

    const buffer = await blob.arrayBuffer();
    window.electron.saveImage(buffer);

    // console.log("DataURL:", blob);

    // const objectURL = Buffer.from()

    // window.electron.saveImage(objectURL)
  }

  function handleOnSubAdd() {
    const newSub = {
      id: maxId.current + 1,
      start: 0,
      end: 0,
      original: "",
      translation: "",
    };

    maxId.current++;

    setSubs((draft) => {
      draft.push(newSub);
    });
  }

  function onSubDeleted(id) {
    setSubs((draft) => draft.filter((sub) => sub.id != id));
  }

  function onSubFocused(id) {
    return (ev) => {
      console.log(id, "Selected");
      setCurFocusedSub(id);
    };
  }

  function handleOnSubInfoChange(id) {
    return (ev) => {
      const { name, value } = ev.target;
      setSubs((draft) => {
        draft.some((sub) => {
          if (sub.id == id) {
            sub[name] = value;
            return true;
          }
        });
      });
    };
  }

  return (
    <div className="App">
      <button onClick={handleOnFileOpen}>Open File</button>
      <button onClick={handleOnRender}>Render</button>
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={handleOnTitleChange}
      />
      {/* <button onClick={handleOnSnapShot}>Capture</button> */}
      <div style={{ display: "flex" }}>
        <video
          controls
          ref={videoRef}
          width={1920 / 4}
          height={1080 / 4}
        ></video>
        <div style={{ position: "relative" }}>
          <canvas
            ref={videoCanvasRef}
            style={{ width: 1920 / 4, height: 1080 / 4, position: "absolute" }}
            width={1920}
            height={1080}
          />
          <canvas
            ref={subCanvasRef}
            style={{ width: 1920 / 4, height: 1080 / 4, position: "relative" }}
            width={1920}
            height={1080}
          />
        </div>
        <img ref={snapshotRef} />
      </div>
      <div>
        <h1>Subtitles</h1>
        <div>
          <button onClick={handleOnSubAdd}>+</button>
        </div>
        <div>
          {subs.length > 0 &&
            subs.map((sub) => (
              <div key={sub.id}>
                <div>
                  <input
                    type="number"
                    step={0.01}
                    name="start"
                    onChange={handleOnSubInfoChange(sub.id)}
                    value={sub.start}
                  />
                  <span>~</span>
                  <input
                    type="number"
                    step={0.01}
                    name="end"
                    onChange={handleOnSubInfoChange(sub.id)}
                    value={sub.end}
                  />
                </div>
                <textarea
                  type="text"
                  name="original"
                  onChange={handleOnSubInfoChange(sub.id)}
                  value={sub.original}
                />
                <textarea
                  type="text"
                  name="translation"
                  onChange={handleOnSubInfoChange(sub.id)}
                  value={sub.translation}
                />
                <button onClick={() => onSubDeleted(sub.id)}>-</button>
                <input
                  type={"radio"}
                  checked={curFocusedSub === sub.id}
                  onChange={onSubFocused(sub.id)}
                />
              </div>
            ))}
        </div>
      </div>
      {/* <button onClick={() => console.dir(subs)}>Show Sub Data</button> */}
      <button onClick={handleOnSubExport}>Export Subtitles</button>
      <button onClick={handleOnSubImport}>Import Subtitles</button>

      <div>
        <h1>Settings</h1>
        <div>
          <button onClick={handleOnSaveSettings}>Save Settings</button>
        </div>
        <div>
          <div>
            <label htmlFor="padding-w">PaddingW</label>
            <input
              type="number"
              name="bgPaddingW"
              step={1}
              id="padding-w"
              value={bgPaddingW}
              onChange={handleOnBgPaddingWChange}
            />
            <label htmlFor="padding-h">PaddingH</label>
            <input
              type="number"
              name="bgPaddingH"
              step={1}
              id="padding-h"
              value={bgPaddingH}
              onChange={handleOnBgPaddingHChange}
            />
            <label htmlFor="bottomSubPadding">Bottom Padding</label>
            <input
              type="number"
              name="bottomSubPadding"
              step={1}
              id="bottomSubPadding"
              value={bottomSubPadding}
              onChange={handleOnBottomSubPaddingChange}
            />
          </div>

          <div>
            <label htmlFor="fontFamily">Font Family</label>
            <select
              name="fontFamily"
              id="fontFamily"
              value={fontFamily}
              onChange={handleOnFontFamilyChange}
            >
              <option value="Pretendard">Pretendard</option>
              <option value="Noto Sans">Noto Sans</option>
            </select>
            <label htmlFor="fontsize">Font Size</label>
            <input
              type="number"
              name="fontSize"
              step={1}
              id="fontsize"
              value={fontSize}
              onChange={handleOnFontSizeChange}
            />
          </div>

          <label htmlFor="Stove L10N">Stove L10N Flag</label>
          <input
            type="checkbox"
            name="stoveL10n"
            id="stoveL10n"
            checked={isStoveL10n}
            onChange={handleOnIsStoveL10nChange}
          />
          <div>
            <label htmlFor="flagDuration">Flag Duration</label>
            <input
              type="number"
              step={0.01}
              disabled={isFlagDurationInfinite}
              name="flagDuration"
              id="flagDuration"
              value={flagDuration}
              onChange={handleOnFlagDurationChange}
            />
            <label htmlFor="durationInf">Stove L10N Flag</label>
            <input
              type="checkbox"
              name="durationInf"
              id="durationInf"
              checked={isFlagDurationInfinite}
              onChange={handleOnIsFlagDurationInfiniteChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
