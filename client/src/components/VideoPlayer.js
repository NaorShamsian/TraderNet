import React, { useImperativeHandle } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

const VideoPlayer = React.forwardRef(({ source, style, resizeMode, shouldPlay, useNativeControls, onPlaybackStatusUpdate }, ref) => {
  const videoUrl = source?.uri || "";
  
  // Convert www.youtube.com to m.youtube.com to load the mobile-optimized page faster
  const mobileUrl = videoUrl.replace("www.youtube.com", "m.youtube.com");

  // Expose empty mock ref methods to prevent any parent component lifecycle crashes
  useImperativeHandle(ref, () => ({
    unloadAsync: async () => {},
    loadAsync: async (src, options) => {}
  }));

  // JavaScript to inject custom CSS hiding YouTube headers, search boxes, comments, and recommended videos
  const injectedCSS = `
    (function() {
      const style = document.createElement('style');
      style.type = 'text/css';
      style.innerHTML = \`
        header, #header, #header-bar, .header,
        #masthead-container, .ytm-navigation-bar, .ytm-app-header-bootstrap,
        ytm-pivot-bar-renderer, ytm-search-box,
        ytm-related-metadata-renderer, .related-list,
        #watch-next-engagement-panel, #comments, .comment-section,
        ytm-comment-section-renderer, ytm-item-section-renderer,
        .ad-container, .ytp-share-button, .ytp-youtube-button,
        #bottom-sheet-container, .ytm-sentiment-bar,
        ytm-media-row-list-renderer, #revisions, #footer,
        #related, #secondary, #comments-button, .mweb-ad-spacer {
          display: none !important;
        }
        body, html {
          background-color: #000 !important;
          overflow: hidden !important;
        }
        /* Lock the mobile HTML5 player container to occupy the full screen viewport */
        .player-container, #player, #player-container-id, .player-control-background {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 99999 !important;
        }
      \`;
      document.head.appendChild(style);
    })();
    true;
  `;

  return (
    <View style={[styles.container, style]}>
      <WebView
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsFullscreenVideo={true}
        mediaPlaybackRequiresUserAction={false}
        style={styles.webview}
        source={{ uri: mobileUrl }}
        injectedJavaScript={injectedCSS}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
    overflow: "hidden",
  },
  webview: {
    backgroundColor: "#000",
    width: "100%",
    height: "100%",
  }
});

export default VideoPlayer;
