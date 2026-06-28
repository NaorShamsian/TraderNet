import React, { useImperativeHandle } from "react";

const VideoPlayer = React.forwardRef(({ source, style, resizeMode, shouldPlay, useNativeControls, onPlaybackStatusUpdate }, ref) => {
  const videoUrl = source?.uri || "";
  const isYouTube = videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");

  // Expose empty mock ref methods to prevent any parent component lifecycle crashes
  useImperativeHandle(ref, () => ({
    unloadAsync: async () => {},
    loadAsync: async (src, options) => {}
  }));

  if (!isYouTube) {
    return (
      <div style={{ width: "100%", height: "100%", backgroundColor: "#000", position: "relative", overflow: "hidden", ...style }}>
        <video
          src={videoUrl}
          controls={useNativeControls !== false}
          autoPlay={shouldPlay !== false}
          style={{ width: "100%", height: "100%", objectFit: resizeMode || "contain" }}
        />
      </div>
    );
  }

  // Extract the YouTube video ID from the watch URL
  const getYoutubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = getYoutubeId(videoUrl) || "U8xH2dEgH5A";
  
  // Construct the official embed URL for Web, hiding YouTube branding and related videos
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=${shouldPlay ? 1 : 0}&rel=0&modestbranding=1&controls=${useNativeControls ? 1 : 0}`;

  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: "#000", position: "relative", overflow: "hidden", ...style }}>
      <iframe
        src={embedUrl}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          border: "none",
        }}
      />
    </div>
  );
});

export default VideoPlayer;
