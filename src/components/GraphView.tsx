import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BaseNote {
  id: string;
  title: string;
  content: string;
}

interface GraphViewProps {
  notes: BaseNote[];
  selectedNote: BaseNote | null;
  onSelectNote: (note: BaseNote) => void;
  onClose: () => void;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  title: string;
  connections: string[];
  phase: number; // For ambient floating
  radius: number; // Animated radius
  targetRadius: number;
}

const extractLinks = (content: string): string[] => {
  const linkRegex = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    links.push(match[1].toLowerCase());
  }
  return links;
};

// Quadratic bezier control point for curved lines
const getCurveControl = (x1: number, y1: number, x2: number, y2: number): { cx: number; cy: number } => {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const offset = dist * 0.15;
  return { cx: mx - dy / dist * offset, cy: my + dx / dist * offset };
};

export const GraphView = ({ notes, selectedNote, onSelectNote, onClose }: GraphViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<NodePosition[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const animationRef = useRef<number>();
  const lastTouchDist = useRef<number | null>(null);
  const timeRef = useRef(0);
  const selectedNoteRef = useRef(selectedNote);
  const hoveredNodeRef = useRef(hoveredNode);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);

  // Keep refs in sync
  useEffect(() => { selectedNoteRef.current = selectedNote; }, [selectedNote]);
  useEffect(() => { hoveredNodeRef.current = hoveredNode; }, [hoveredNode]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);

  const getThemeColors = useCallback(() => {
    const style = getComputedStyle(document.documentElement);
    const primary = style.getPropertyValue('--primary').trim();
    const accent = style.getPropertyValue('--accent').trim();
    const foreground = style.getPropertyValue('--foreground').trim();
    const background = style.getPropertyValue('--background').trim();
    const muted = style.getPropertyValue('--muted-foreground').trim();
    const fmt = (hsl: string) => {
      const p = hsl.split(' ');
      return p.length === 3 ? `hsl(${p[0]}, ${p[1]}, ${p[2]})` : `hsl(${hsl})`;
    };
    const fmta = (hsl: string, a: number) => {
      const p = hsl.split(' ');
      return p.length === 3 ? `hsla(${p[0]}, ${p[1]}, ${p[2]}, ${a})` : `hsla(${hsl}, ${a})`;
    };
    return {
      primary: fmt(primary), accent: fmt(accent), foreground: fmt(foreground),
      background: fmt(background), muted: fmt(muted),
      primaryAlpha: (a: number) => fmta(primary, a),
      accentAlpha: (a: number) => fmta(accent, a),
      foregroundAlpha: (a: number) => fmta(foreground, a),
    };
  }, []);

  // Initialize nodes
  useEffect(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const cx = width / 2;
    const cy = height / 2;

    nodesRef.current = notes.map((note, i) => {
      const angle = (2 * Math.PI * i) / notes.length;
      const r = Math.min(width, height) * 0.28;
      const x = cx + Math.cos(angle) * r + (Math.random() - 0.5) * 40;
      const y = cy + Math.sin(angle) * r + (Math.random() - 0.5) * 40;
      return {
        id: note.id, x, y, vx: 0, vy: 0, targetX: x, targetY: y,
        title: note.title, connections: extractLinks(note.content),
        phase: Math.random() * Math.PI * 2, radius: 6, targetRadius: 7,
      };
    });
  }, [notes]);

  // Continuous animation loop — smooth physics + ambient floating + rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const animate = () => {
      timeRef.current += 0.008; // Slow time progression for relaxed feel
      const t = timeRef.current;
      const nodes = nodesRef.current;
      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;

      // --- Physics (very soft) ---
      for (let i = 0; i < nodes.length; i++) {
        // Ambient floating — gentle sine wave drift
        const floatX = Math.sin(t * 0.7 + nodes[i].phase) * 0.3;
        const floatY = Math.cos(t * 0.5 + nodes[i].phase * 1.3) * 0.3;
        nodes[i].vx += floatX * 0.02;
        nodes[i].vy += floatY * 0.02;

        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          // Soft repulsion
          const repulsion = 3000 / (dist * dist);
          const fx = (dx / dist) * repulsion;
          const fy = (dy / dist) * repulsion;
          nodes[i].vx -= fx * 0.3;
          nodes[i].vy -= fy * 0.3;
          nodes[j].vx += fx * 0.3;
          nodes[j].vy += fy * 0.3;

          // Soft attraction for connections
          const connected =
            nodes[i].connections.some(c => nodes[j].title.toLowerCase().includes(c)) ||
            nodes[j].connections.some(c => nodes[i].title.toLowerCase().includes(c));
          if (connected) {
            const ideal = 150;
            const force = (dist - ideal) * 0.003;
            nodes[i].vx += (dx / dist) * force;
            nodes[i].vy += (dy / dist) * force;
            nodes[j].vx -= (dx / dist) * force;
            nodes[j].vy -= (dy / dist) * force;
          }
        }

        // Heavy damping for that watery, relaxed movement
        nodes[i].vx *= 0.92;
        nodes[i].vy *= 0.92;
        nodes[i].x += nodes[i].vx;
        nodes[i].y += nodes[i].vy;

        // Animate radius
        const isSelected = selectedNoteRef.current?.id === nodes[i].id;
        const isHovered = hoveredNodeRef.current === nodes[i].id;
        nodes[i].targetRadius = isSelected ? 14 : isHovered ? 11 : 7;
        nodes[i].radius += (nodes[i].targetRadius - nodes[i].radius) * 0.08;
      }

      // --- Render ---
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width * 2;
      canvas.height = height * 2;
      ctx.scale(2, 2);
      const colors = getThemeColors();

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(currentPan.x, currentPan.y);
      ctx.scale(currentZoom, currentZoom);

      // Draw connections — curved, soft, watery lines
      nodes.forEach(node => {
        node.connections.forEach(connTitle => {
          const target = nodes.find(n => n.title.toLowerCase().includes(connTitle.toLowerCase()));
          if (target) {
            const { cx, cy } = getCurveControl(node.x, node.y, target.x, target.y);
            const dist = Math.sqrt((target.x - node.x) ** 2 + (target.y - node.y) ** 2);
            const alpha = Math.max(0.06, Math.min(0.25, 1 - dist / 600));

            // Animated wave on connection lines
            const wave = Math.sin(t * 2 + node.phase) * 0.5 + 0.5;

            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.quadraticCurveTo(cx + Math.sin(t + node.phase) * 3, cy + Math.cos(t + node.phase) * 3, target.x, target.y);
            ctx.strokeStyle = colors.primaryAlpha(alpha * (0.7 + wave * 0.3));
            ctx.lineWidth = 1.5 + wave * 0.5;
            ctx.lineCap = 'round';
            ctx.stroke();
          }
        });
      });

      // Draw nodes with ambient glow
      nodes.forEach(node => {
        const isSelected = selectedNoteRef.current?.id === node.id;
        const isHovered = hoveredNodeRef.current === node.id;
        const r = node.radius;
        const pulse = Math.sin(t * 1.5 + node.phase) * 0.5 + 0.5;

        // Outer glow — always present, subtle ambient
        const glowRadius = r * (3 + pulse * 1.5);
        const gradient = ctx.createRadialGradient(node.x, node.y, r * 0.5, node.x, node.y, glowRadius);
        if (isSelected) {
          gradient.addColorStop(0, colors.primaryAlpha(0.35));
          gradient.addColorStop(0.5, colors.primaryAlpha(0.1));
          gradient.addColorStop(1, colors.primaryAlpha(0));
        } else if (isHovered) {
          gradient.addColorStop(0, colors.primaryAlpha(0.25));
          gradient.addColorStop(0.6, colors.primaryAlpha(0.05));
          gradient.addColorStop(1, colors.primaryAlpha(0));
        } else {
          gradient.addColorStop(0, colors.accentAlpha(0.12 + pulse * 0.06));
          gradient.addColorStop(1, colors.accentAlpha(0));
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Node circle with soft border
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        if (isSelected) {
          ctx.fillStyle = colors.primary;
          ctx.shadowColor = colors.primaryAlpha(0.5);
          ctx.shadowBlur = 12;
        } else if (isHovered) {
          ctx.fillStyle = colors.primary;
          ctx.shadowColor = colors.primaryAlpha(0.3);
          ctx.shadowBlur = 8;
        } else {
          ctx.fillStyle = colors.accentAlpha(0.7 + pulse * 0.3);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        ctx.fillStyle = colors.foregroundAlpha(isSelected || isHovered ? 0.95 : 0.6);
        ctx.font = `${isSelected ? '600 ' : '400 '}${isSelected ? 13 : 11}px Nunito`;
        ctx.textAlign = 'center';
        const label = node.title.length > 18 ? node.title.slice(0, 18) + '…' : node.title;
        ctx.fillText(label, node.x, node.y + r + 18);
      });

      ctx.restore();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [getThemeColors, notes]);

  // Wheel zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setZoom(prev => {
        const next = Math.max(0.3, Math.min(3, prev + delta));
        const s = next / prev;
        setPan(p => ({ x: mx - s * (mx - p.x), y: my - s * (my - p.y) }));
        return next;
      });
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  }, [pan]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / lastTouchDist.current;
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const px = cx - rect.left;
        const py = cy - rect.top;
        setZoom(prev => {
          const next = Math.max(0.3, Math.min(3, prev * scale));
          const s = next / prev;
          setPan(p => ({ x: px - s * (px - p.x), y: py - s * (py - p.y) }));
          return next;
        });
      }
      lastTouchDist.current = dist;
    } else if (e.touches.length === 1 && isDragging) {
      setPan({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    }
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Tap to select
    if (e.changedTouches.length === 1) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.changedTouches[0].clientX - rect.left - pan.x) / zoom;
        const y = (e.changedTouches[0].clientY - rect.top - pan.y) / zoom;
        const clicked = nodesRef.current.find(n => {
          const dx = n.x - x, dy = n.y - y;
          return Math.sqrt(dx * dx + dy * dy) < 28;
        });
        if (clicked) {
          const note = notes.find(n => n.id === clicked.id);
          if (note) onSelectNote(note);
        }
      }
    }
    setIsDragging(false);
    lastTouchDist.current = null;
  }, [pan, zoom, notes, onSelectNote]);

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    const hovered = nodesRef.current.find(n => {
      const dx = n.x - x, dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 22;
    });
    setHoveredNode(hovered?.id || null);
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  }, [isDragging, dragStart, pan, zoom]);

  const handleMouseUp = () => setIsDragging(false);

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    const clicked = nodesRef.current.find(n => {
      const dx = n.x - x, dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 22;
    });
    if (clicked) {
      const note = notes.find(n => n.id === clicked.id);
      if (note) onSelectNote(note);
    }
  };

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(0.3, Math.min(3, prev + delta)));
  };

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md animate-fade-in">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 sm:p-4 border-b border-border/50 bg-background/60 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-xl sm:text-2xl">🗺️</span>
          <h2 className="text-base sm:text-xl font-bold truncate">Graph View</h2>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {notes.length} notes · [[Note Title]] to link
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Mobile note count */}
      <div className="absolute top-[52px] left-3 sm:hidden z-10">
        <span className="text-[10px] text-muted-foreground bg-card/70 backdrop-blur-sm px-2 py-0.5 rounded-full border border-border/50">
          {notes.length} notes · tap to open
        </span>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 safe-area-bottom left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-card/80 backdrop-blur-md border border-border/50 rounded-2xl p-1.5 shadow-xl z-10">
        <Button variant="ghost" size="icon-sm" onClick={() => handleZoom(-0.15)} className="rounded-xl">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-xs w-11 text-center tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="icon-sm" onClick={() => handleZoom(0.15)} className="rounded-xl">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <div className="w-px h-5 bg-border/50 mx-0.5" />
        <Button variant="ghost" size="icon-sm" onClick={resetView} className="rounded-xl">
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="absolute inset-0 top-[52px] sm:top-16 cursor-grab active:cursor-grabbing touch-none"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </div>

      {/* Legend — desktop only */}
      <div className="absolute bottom-6 right-6 bg-card/70 backdrop-blur-md border border-border/50 rounded-2xl p-4 shadow-xl z-10 hidden md:block">
        <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Legend</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-primary shadow-sm shadow-primary/30" />
            <span className="text-muted-foreground">Selected</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-accent/70" />
            <span className="text-muted-foreground">Notes</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-5 h-[1.5px] bg-primary/30 rounded-full" />
            <span className="text-muted-foreground">Links</span>
          </div>
        </div>
      </div>
    </div>
  );
};
