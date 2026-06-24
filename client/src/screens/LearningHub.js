import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Video } from "expo-av";
import { WebView } from "react-native-webview";

const { width } = Dimensions.get("window");

const LearningHub = ({ onLogout, onNavigate, theme, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState("video"); // 'video' or 'terminal'

  const colors = theme || {
    bg: isDarkMode ? "#0b0f19" : "#f8fafc",
    cardBg: isDarkMode ? "#151c2c" : "#ffffff",
    text: isDarkMode ? "#f3f4f6" : "#0f172a",
    subText: isDarkMode ? "#9ca3af" : "#64748b",
    border: isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)",
    inputBg: isDarkMode ? "#1f293d" : "#f1f5f9",
    inputText: isDarkMode ? "#f3f4f6" : "#0f172a",
    primary: "#6366f1",
  };

  // ================= VIDEO PLAYER STATE =================
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentVideo, setCurrentVideo] = useState({
    id: 1,
    title: "1. השווקים השונים בשוק ההון - מבוא למסחר",
    duration: "12:45",
    thumbnail: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    mentor: "TTrades Education",
  });

  const lessons = [
    {
      id: 1,
      title: "1. השווקים השונים בשוק ההון - מבוא למסחר",
      duration: "12:45",
      thumbnail: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      mentor: "TTrades Education",
    },
    {
      id: 2,
      title: "2. הנר היפני - אנטומיה ומבנה הנרות",
      duration: "15:20",
      thumbnail: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=600",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      mentor: "TTrades Education",
    },
    {
      id: 3,
      title: "3. מגמות למחיר - זיהוי כיוון השוק",
      duration: "14:10",
      thumbnail: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      mentor: "TTrades Education",
    },
    {
      id: 4,
      title: "4. תמיכה והתנגדות - מיפוי רמות מפתח",
      duration: "18:35",
      thumbnail: "https://images.unsplash.com/photo-1642390091310-70f1a55d6a09?w=600",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
      mentor: "TTrades Education",
    },
    {
      id: 5,
      title: "5. ביאס שבועי - קביעת כיוון שבועי ויומי",
      duration: "22:15",
      thumbnail: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
      mentor: "TTrades Education",
    },
    {
      id: 6,
      title: "6. מבנה השוק - BOS, CHoCH וסירקולציה",
      duration: "20:50",
      thumbnail: "https://images.unsplash.com/photo-1598257006458-087169a1f08d?w=600",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
      mentor: "TTrades Education",
    },
    {
      id: 7,
      title: "7. ניהול סיכונים - המפתח להישרדות ורווחיות",
      duration: "16:30",
      thumbnail: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
      mentor: "TTrades Education",
    },
    {
      id: 8,
      title: "8. פסיכולוגיית מסחר - לשלוט ברגשות בתוך העסקה",
      duration: "13:40",
      thumbnail: "https://images.unsplash.com/photo-1607863680198-23d4b2565df0?w=600",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      mentor: "TTrades Education",
    },
  ];

  const handlePlayLesson = async (lesson) => {
    setCurrentVideo(lesson);
    setPlaying(true);
    if (videoRef.current) {
      await videoRef.current.loadAsync(
        { uri: lesson.videoUrl },
        { shouldPlay: true },
        false
      );
    }
  };

  const handlePlayPause = async () => {
    if (playing) {
      await videoRef.current?.pauseAsync();
      setPlaying(false);
    } else {
      await videoRef.current?.playAsync();
      setPlaying(true);
    }
  };

  // ================= WEBVIEW TRADING TERMINAL HTML =================
  const terminalHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        body, html {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          background-color: #0b0f19;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          user-select: none;
          -webkit-user-select: none;
        }
        #widget_container {
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
          z-index: 1;
        }
        #drawing_canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10;
          pointer-events: none;
          cursor: crosshair;
        }
        /* Sleek Draggable Floating Toolbar */
        .toolbar {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 20;
          background: rgba(21, 28, 44, 0.88);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 24px;
          padding: 8px 16px;
          display: flex;
          gap: 6px;
          align-items: center;
          box-shadow: 0 12px 36px 0 rgba(0, 0, 0, 0.5);
          max-width: 95%;
          flex-wrap: wrap;
          justify-content: center;
          touch-action: none; /* Crucial for drag gestures to work on mobile */
          cursor: move;
        }
        .tool-btn {
          background: transparent;
          border: 1px solid transparent;
          color: #9ca3af;
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s ease;
          outline: none;
        }
        .tool-btn:hover {
          color: #f3f4f6;
        }
        .tool-btn.active {
          background: #6366f1;
          color: #ffffff;
          border-color: rgba(99, 102, 241, 0.4);
          box-shadow: 0 0 8px rgba(99, 102, 241, 0.4);
        }
        .tool-btn.danger {
          color: #ef4444;
        }
        .tool-btn.danger:hover {
          background: rgba(239, 68, 68, 0.15);
        }
        .divider {
          width: 1px;
          height: 18px;
          background: rgba(255, 255, 255, 0.15);
          margin: 0 2px;
        }
        /* Color Picker */
        .color-picker {
          display: flex;
          gap: 5px;
          align-items: center;
          margin-left: 4px;
        }
        .color-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid transparent;
          transition: transform 0.1s ease;
        }
        .color-dot.selected {
          border-color: #ffffff;
          transform: scale(1.15);
        }
        /* Banner */
        .status-banner {
          position: absolute;
          bottom: 12px;
          left: 12px;
          z-index: 20;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 6px 12px;
          border-radius: 8px;
          color: #f3f4f6;
          font-size: 9px;
          font-weight: 700;
          pointer-events: none;
          backdrop-filter: blur(6px);
          letter-spacing: 0.5px;
        }
      </style>
    </head>
    <body>
      <div id="widget_container"></div>
      <canvas id="drawing_canvas"></canvas>

      <div class="toolbar">
        <button id="btn_chart" class="tool-btn active" onclick="setMode('chart')">
          🔍 Chart
        </button>
        <div class="divider"></div>
        <button id="btn_trendline" class="tool-btn" onclick="setMode('trendline')">
          📈 Trend
        </button>
        <button id="btn_fibonacci" class="tool-btn" onclick="setMode('fibonacci')">
          🧬 Fib
        </button>
        <button id="btn_support" class="tool-btn" onclick="setMode('support')">
          🟢 Supp
        </button>
        <button id="btn_resistance" class="tool-btn" onclick="setMode('resistance')">
          🔴 Res
        </button>
        <div class="divider"></div>
        <div class="color-picker">
          <div class="color-dot selected" style="background-color: #10b981;" onclick="setColor('#10b981', this)"></div>
          <div class="color-dot" style="background-color: #ef4444;" onclick="setColor('#ef4444', this)"></div>
          <div class="color-dot" style="background-color: #6366f1;" onclick="setColor('#6366f1', this)"></div>
          <div class="color-dot" style="background-color: #f59e0b;" onclick="setColor('#f59e0b', this)"></div>
        </div>
        <div class="divider"></div>
        <button class="tool-btn danger" onclick="clearDrawings()">
          🗑️
        </button>
      </div>

      <div id="status_banner" class="status-banner">
        MODE: INTERACT WITH CHART (PAN/ZOOM)
      </div>

      <!-- Live TradingView library -->
      <script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
      <script type="text/javascript">
        let tvWidget = null;
        try {
          tvWidget = new TradingView.widget({
            "autosize": true,
            "symbol": "BINANCE:BTCUSDT",
            "interval": "D",
            "timezone": "Etc/UTC",
            "theme": "dark",
            "style": "1",
            "locale": "en",
            "toolbar_bg": "#0b0f19",
            "enable_publishing": false,
            "hide_side_toolbar": true, // HIDDEN TRADINGVIEW DEFAULT TOOLS
            "allow_symbol_change": true,
            "container_id": "widget_container"
          });
        } catch (e) {
          console.error("TradingView load error:", e);
        }

        // Draggable Toolbar Logic
        const toolbar = document.querySelector('.toolbar');
        let isDraggingToolbar = false;
        let startX, startY;
        let initialLeft, initialTop;

        toolbar.addEventListener('pointerdown', (e) => {
          if (e.target.closest('button') || e.target.closest('.color-picker') || e.target.classList.contains('divider')) {
            return; // let buttons work normally
          }
          isDraggingToolbar = true;
          startX = e.clientX;
          startY = e.clientY;

          const rect = toolbar.getBoundingClientRect();
          initialLeft = rect.left;
          initialTop = rect.top;

          // Prevent jump by setting absolute coordinates and removing translate
          toolbar.style.left = initialLeft + 'px';
          toolbar.style.top = initialTop + 'px';
          toolbar.style.transform = 'none';
          toolbar.style.margin = '0';

          toolbar.setPointerCapture(e.pointerId);
          e.preventDefault();
        });

        toolbar.addEventListener('pointermove', (e) => {
          if (!isDraggingToolbar) return;

          const dx = e.clientX - startX;
          const dy = e.clientY - startY;

          let newLeft = initialLeft + dx;
          let newTop = initialTop + dy;

          const rect = toolbar.getBoundingClientRect();
          newLeft = Math.max(8, Math.min(window.innerWidth - rect.width - 8, newLeft));
          newTop = Math.max(8, Math.min(window.innerHeight - rect.height - 8, newTop));

          toolbar.style.left = newLeft + 'px';
          toolbar.style.top = newTop + 'px';
        });

        toolbar.addEventListener('pointerup', (e) => {
          if (!isDraggingToolbar) return;
          isDraggingToolbar = false;
          toolbar.releasePointerCapture(e.pointerId);
        });

        toolbar.addEventListener('pointercancel', (e) => {
          if (!isDraggingToolbar) return;
          isDraggingToolbar = false;
          toolbar.releasePointerCapture(e.pointerId);
        });

        // Drawing Canvas Engine
        const canvas = document.getElementById('drawing_canvas');
        const ctx = canvas.getContext('2d');
        const statusBanner = document.getElementById('status_banner');

        let currentMode = 'chart';
        let currentColor = '#10b981';
        let drawings = [];
        let isDrawing = false;
        let startPoint = { x: 0, y: 0 };
        let currentPoint = { x: 0, y: 0 };

        function resizeCanvas() {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          drawAll();
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        function setMode(mode) {
          currentMode = mode;
          
          document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
          });
          
          const activeBtn = document.getElementById('btn_' + mode);
          if (activeBtn) activeBtn.classList.add('active');

          if (mode === 'chart') {
            canvas.style.pointerEvents = 'none';
            statusBanner.innerText = 'MODE: INTERACT WITH CHART (PAN/ZOOM)';
            statusBanner.style.color = '#f3f4f6';
          } else {
            canvas.style.pointerEvents = 'auto';
            statusBanner.innerText = 'MODE: DRAW ' + mode.toUpperCase() + ' (CHART LOCKED)';
            statusBanner.style.color = mode === 'support' ? '#10b981' : (mode === 'resistance' ? '#ef4444' : '#6366f1');
          }
          isDrawing = false;
          drawAll();
        }

        function setColor(color, dotElem) {
          currentColor = color;
          document.querySelectorAll('.color-dot').forEach(dot => dot.classList.remove('selected'));
          dotElem.classList.add('selected');
        }

        function clearDrawings() {
          drawings = [];
          isDrawing = false;
          drawAll();
        }

        canvas.addEventListener('pointerdown', (e) => {
          if (currentMode === 'chart') return;
          
          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          
          isDrawing = true;
          startPoint = { x, y };
          currentPoint = { x, y };

          if (currentMode === 'support') {
            drawings.push({ type: 'horizontal', y, color: '#10b981', label: 'Support Level' });
            isDrawing = false;
            drawAll();
          } else if (currentMode === 'resistance') {
            drawings.push({ type: 'horizontal', y, color: '#ef4444', label: 'Resistance Level' });
            isDrawing = false;
            drawAll();
          }
        });

        canvas.addEventListener('pointermove', (e) => {
          if (!isDrawing) return;
          
          const rect = canvas.getBoundingClientRect();
          currentPoint = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          };
          drawAll();
        });

        canvas.addEventListener('pointerup', (e) => {
          if (!isDrawing) return;
          isDrawing = false;

          const rect = canvas.getBoundingClientRect();
          const endX = e.clientX - rect.left;
          const endY = e.clientY - rect.top;

          const dist = Math.hypot(endX - startPoint.x, endY - startPoint.y);
          if (dist > 5) {
            if (currentMode === 'trendline') {
              drawings.push({
                type: 'trendline',
                x1: startPoint.x,
                y1: startPoint.y,
                x2: endX,
                y2: endY,
                color: currentColor
              });
            } else if (currentMode === 'fibonacci') {
              drawings.push({
                type: 'fibonacci',
                x1: startPoint.x,
                y1: startPoint.y,
                x2: endX,
                y2: endY,
                color: currentColor
              });
            }
          }
          drawAll();
        });

        function drawAll() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          drawings.forEach(d => {
            drawItem(d);
          });

          if (isDrawing) {
            if (currentMode === 'trendline') {
              drawItem({
                type: 'trendline',
                x1: startPoint.x,
                y1: startPoint.y,
                x2: currentPoint.x,
                y2: currentPoint.y,
                color: currentColor,
                preview: true
              });
            } else if (currentMode === 'fibonacci') {
              drawItem({
                type: 'fibonacci',
                x1: startPoint.x,
                y1: startPoint.y,
                x2: currentPoint.x,
                y2: currentPoint.y,
                color: currentColor,
                preview: true
              });
            }
          }
        }

        function drawItem(item) {
          if (item.type === 'horizontal') {
            ctx.beginPath();
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.moveTo(0, item.y);
            ctx.lineTo(canvas.width, item.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Text tag
            ctx.fillStyle = item.color;
            ctx.font = 'bold 9px monospace';
            ctx.fillRect(10, item.y - 15, 105, 13);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(item.label.toUpperCase(), 14, item.y - 5);
          } 
          else if (item.type === 'trendline') {
            ctx.beginPath();
            ctx.strokeStyle = item.color;
            ctx.lineWidth = item.preview ? 1.5 : 2.5;
            if (item.preview) ctx.setLineDash([4, 4]);
            ctx.moveTo(item.x1, item.y1);
            ctx.lineTo(item.x2, item.y2);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.fillStyle = item.color;
            ctx.arc(item.x1, item.y1, 4, 0, Math.PI * 2);
            ctx.arc(item.x2, item.y2, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          else if (item.type === 'fibonacci') {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255,255,255,0.18)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.moveTo(item.x1, item.y1);
            ctx.lineTo(item.x2, item.y2);
            ctx.stroke();
            ctx.setLineDash([]);

            const deltaY = item.y2 - item.y1;
            const fibRatios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
            const fibLabels = ['100% (1.000)', '78.6% (0.786)', '61.8% (0.618)', '50.0% (0.500)', '38.2% (0.382)', '23.6% (0.236)', '0% (0.000)'];

            fibRatios.forEach((ratio, index) => {
              const levelY = item.y1 + deltaY * ratio;
              ctx.beginPath();
              ctx.strokeStyle = item.color;
              ctx.lineWidth = (ratio === 0 || ratio === 1) ? 1.5 : 1;
              ctx.moveTo(0, levelY);
              ctx.lineTo(canvas.width, levelY);
              ctx.stroke();

              ctx.fillStyle = 'rgba(11, 15, 25, 0.75)';
              ctx.fillRect(6, levelY - 11, 85, 10);
              ctx.fillStyle = item.color;
              ctx.font = '9px monospace';
              ctx.fillText(fibLabels[index], 10, levelY - 3);

              if (index < fibRatios.length - 1) {
                const nextLevelY = item.y1 + deltaY * fibRatios[index + 1];
                ctx.fillStyle = hexToRgba(item.color, 0.035);
                ctx.fillRect(0, levelY, canvas.width, nextLevelY - levelY);
              }
            });
          }
        }

        function hexToRgba(hex, alpha) {
          let c;
          if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
            c= hex.substring(1).split('');
            if(c.length== 3){
              c= [c[0], c[0], c[1], c[1], c[2], c[2]];
            }
            c= '0x'+c.join('');
            return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
          }
          return 'rgba(99,102,241,' + alpha + ')';
        }
      </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>🎓 TraderNet Academy</Text>
      </View>

      {/* Segment Tabs */}
      <View 
        style={[
          styles.segmentContainer, 
          { 
            backgroundColor: isDarkMode ? "rgba(21, 28, 44, 0.6)" : "rgba(241, 245, 249, 0.8)", 
            borderColor: colors.border 
          }
        ]}
      >
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "video" && { backgroundColor: colors.primary }]}
          onPress={() => setActiveTab("video")}
        >
          <Text style={[styles.segmentText, { color: activeTab === "video" ? "#fff" : colors.subText }]}>
            🎬 Video Tutorials
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "terminal" && { backgroundColor: colors.primary }]}
          onPress={() => setActiveTab("terminal")}
        >
          <Text style={[styles.segmentText, { color: activeTab === "terminal" ? "#fff" : colors.subText }]}>
            📈 Professional Terminal
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "video" ? (
        // ================= VIDEO SCREEN =================
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={[styles.videoPlayerCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={styles.videoWindow}>
              <Video
                ref={videoRef}
                source={{ uri: currentVideo.videoUrl }}
                style={styles.videoPlayer}
                resizeMode="contain"
                shouldPlay={playing}
                useNativeControls={true}
                onPlaybackStatusUpdate={(status) => {
                  if (status.isLoaded) {
                    setPlaying(status.isPlaying);
                  }
                }}
              />

              {/* Simulated high-end thumbnail cover before playing */}
              {!playing && (
                <View style={styles.thumbnailOverlay}>
                  <Image
                    source={{ uri: currentVideo.thumbnail }}
                    style={styles.videoThumbnail}
                    resizeMode="cover"
                  />
                  <View style={styles.darkenCover} />
                  
                  <View style={styles.instructorTag}>
                    <Text style={styles.instructorText}>MENTOR: {currentVideo.mentor.toUpperCase()}</Text>
                  </View>

                  <TouchableOpacity style={styles.bigPlayBtn} onPress={handlePlayPause}>
                    <Text style={styles.bigPlayBtnText}>▶</Text>
                  </TouchableOpacity>

                  <Text style={styles.playPrompt}>Tap to start learning</Text>
                </View>
              )}
            </View>

            <View style={styles.playerMeta}>
              <Text style={[styles.currentVideoTitle, { color: colors.text }]}>{currentVideo.title}</Text>
              <Text style={[styles.currentVideoMentor, { color: colors.subText }]}>Course Instructor: {currentVideo.mentor} • Length: {currentVideo.duration}</Text>
            </View>
          </View>

          {/* Course Outline List */}
          <Text style={[styles.subHeading, { color: colors.text }]}>Educational Syllabus (Chronological Order)</Text>
          {lessons.map((lesson) => {
            const isSelected = currentVideo.id === lesson.id;
            return (
              <TouchableOpacity
                key={lesson.id}
                style={[
                  styles.lessonCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.border },
                  isSelected && { 
                    borderColor: colors.primary, 
                    backgroundColor: isDarkMode ? "rgba(99, 102, 241, 0.1)" : "rgba(99, 102, 241, 0.04)" 
                  },
                ]}
                onPress={() => handlePlayLesson(lesson)}
              >
                <Image source={{ uri: lesson.thumbnail }} style={styles.lessonThumb} />
                <View style={styles.lessonMeta}>
                  <Text style={[styles.lessonTitle, { color: colors.text }]} numberOfLines={1}>
                    {lesson.title}
                  </Text>
                  <Text style={[styles.lessonInstructor, { color: colors.subText }]}>By {lesson.mentor}</Text>
                  <Text style={[styles.lessonDuration, { color: colors.primary }]}>⏳ {lesson.duration} minutes</Text>
                </View>
                {isSelected && (
                  <Text style={[styles.activeCheck, { color: colors.primary }]}>Active</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        // ================= TERMINAL WEBVIEW & CANVAS SCREEN (FULL SCREEN WORKSPACE) =================
        <View style={styles.terminalContainer}>
          <View style={[styles.canvasDescCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.canvasDescTitle, { color: colors.text }]}>📊 Active Candlestick Terminal</Text>
            <Text style={[styles.canvasDescText, { color: colors.subText }]}>
              Analyze real-time market action. Toggle **Draw Mode** at the top floating menu to draw custom **Trendlines**, **Fibonacci Retracements**, or **Support/Resistance lines** directly on the canvas overlay.
            </Text>
          </View>

          {/* Premium WebView Terminal Card (flex: 1 for full screen size) */}
          <View style={[styles.terminalCard, { borderColor: colors.border, backgroundColor: "#0b0f19" }]}>
            <WebView
              originWhitelist={["*"]}
              source={{ html: terminalHtml }}
              style={styles.webview}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.terminalLoading}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.subText }]}>Loading Live TradingView Feeds...</Text>
                </View>
              )}
            />
          </View>
          
          <Text style={[styles.canvasFooterLabel, { color: colors.subText }]}>
            * Zoom and scroll the live chart in Chart Mode. Lock the chart and draw overlays by selecting any drawing tool on the toolbar.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 10 : 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f3f4f6",
    marginBottom: 8,
  },
  segmentContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 12,
    justifyContent: "space-between",
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "700",
  },
  // VIDEO PLAYER STYLES
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  videoPlayerCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },
  videoWindow: {
    width: "100%",
    height: 200,
    backgroundColor: "#000",
    position: "relative",
  },
  videoPlayer: {
    width: "100%",
    height: "100%",
  },
  thumbnailOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  videoThumbnail: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  darkenCover: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  instructorTag: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(99, 102, 241, 0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  instructorText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  bigPlayBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(99, 102, 241, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  bigPlayBtnText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 3,
  },
  playPrompt: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 10,
  },
  playerMeta: {
    padding: 16,
  },
  currentVideoTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  currentVideoMentor: {
    fontSize: 11,
  },
  subHeading: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  lessonCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  lessonThumb: {
    width: 65,
    height: 50,
    borderRadius: 8,
  },
  lessonMeta: {
    flex: 1,
    marginLeft: 12,
  },
  lessonTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  lessonInstructor: {
    fontSize: 10,
    marginTop: 2,
  },
  lessonDuration: {
    fontSize: 9,
    fontWeight: "700",
    marginTop: 2,
  },
  activeCheck: {
    fontSize: 11,
    fontWeight: "800",
  },

  // TERMINAL WEBVIEW STYLES (FULL SCREEN AREA)
  terminalContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
  },
  canvasDescCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  canvasDescTitle: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },
  canvasDescText: {
    fontSize: 11,
    lineHeight: 16,
  },
  terminalCard: {
    flex: 1, // OCCUPY ALL REMAINING HEIGHT IN FLEXBOX CONTAINER
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 6,
    position: "relative",
  },
  webview: {
    flex: 1,
  },
  terminalLoading: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0b0f19",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  loadingText: {
    fontSize: 12,
    marginTop: 12,
    fontWeight: "600",
  },
  canvasFooterLabel: {
    fontSize: 10,
    textAlign: "center",
    marginTop: 2,
    lineHeight: 14,
  },
});

export default LearningHub;
