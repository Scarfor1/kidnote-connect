import { useEffect, useRef, useState, useCallback } from 'react';
import { Note } from '@/hooks/useNotes';
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
  title: string;
  connections: string[];
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

export const GraphView = ({ notes, selectedNote, onSelectNote, onClose }: GraphViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<NodePosition[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const animationRef = useRef<number>();
  const lastTouchDist = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);

  // Initialize nodes
  useEffect(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const centerX = width / 2;
    const centerY = height / 2;

    const newNodes: NodePosition[] = notes.map((note, i) => {
      const angle = (2 * Math.PI * i) / notes.length;
      const radius = Math.min(width, height) * 0.3;
      const links = extractLinks(note.content);
      return {
        id: note.id,
        x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 50,
        y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 50,
        vx: 0, vy: 0,
        title: note.title,
        connections: links,
      };
    });
    setNodes(newNodes);
  }, [notes]);

  // Physics simulation
  useEffect(() => {
    if (nodes.length === 0) return;
    const simulate = () => {
      setNodes(prevNodes => {
        const newNodes = prevNodes.map(node => ({ ...node }));
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const dx = newNodes[j].x - newNodes[i].x;
            const dy = newNodes[j].y - newNodes[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const repulsion = 5000 / (dist * dist);
            const fx = (dx / dist) * repulsion;
            const fy = (dy / dist) * repulsion;
            newNodes[i].vx -= fx; newNodes[i].vy -= fy;
            newNodes[j].vx += fx; newNodes[j].vy += fy;

            const hasConnection =
              newNodes[i].connections.some(c => newNodes[j].title.toLowerCase().includes(c)) ||
              newNodes[j].connections.some(c => newNodes[i].title.toLowerCase().includes(c));
            if (hasConnection) {
              const attraction = dist * 0.01;
              newNodes[i].vx += (dx / dist) * attraction;
              newNodes[i].vy += (dy / dist) * attraction;
              newNodes[j].vx -= (dx / dist) * attraction;
              newNodes[j].vy -= (dy / dist) * attraction;
            }
          }
          newNodes[i].vx *= 0.9; newNodes[i].vy *= 0.9;
          newNodes[i].x += newNodes[i].vx; newNodes[i].y += newNodes[i].vy;
        }
        return newNodes;
      });
      animationRef.current = requestAnimationFrame(simulate);
    };
    animationRef.current = requestAnimationFrame(simulate);
    const timeout = setTimeout(() => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }, 3000);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      clearTimeout(timeout);
    };
  }, [nodes.length]);

  const getThemeColors = useCallback(() => {
    const style = getComputedStyle(document.documentElement);
    const primary = style.getPropertyValue('--primary').trim();
    const accent = style.getPropertyValue('--accent').trim();
    const foreground = style.getPropertyValue('--foreground').trim();
    const formatHsl = (hsl: string) => {
      const parts = hsl.split(' ');
      return parts.length === 3 ? `hsl(${parts[0]}, ${parts[1]}, ${parts[2]})` : `hsl(${hsl})`;
    };
    const formatHsla = (hsl: string, alpha: number) => {
      const parts = hsl.split(' ');
      return parts.length === 3 ? `hsla(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})` : `hsla(${hsl}, ${alpha})`;
    };
    return {
      primary: formatHsl(primary),
      primaryAlpha: (alpha: number) => formatHsla(primary, alpha),
      accent: formatHsl(accent),
      foreground: formatHsl(foreground),
    };
  }, []);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * 2; canvas.height = height * 2;
    ctx.scale(2, 2);
    const colors = getThemeColors();
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    ctx.strokeStyle = colors.primaryAlpha(0.2);
    ctx.lineWidth = 1.5;
    nodes.forEach(node => {
      node.connections.forEach(connTitle => {
        const target = nodes.find(n => n.title.toLowerCase().includes(connTitle.toLowerCase()));
        if (target) {
          ctx.beginPath(); ctx.moveTo(node.x, node.y); ctx.lineTo(target.x, target.y); ctx.stroke();
        }
      });
    });

    nodes.forEach(node => {
      const isSelected = selectedNote?.id === node.id;
      const isHovered = hoveredNode === node.id;
      const radius = isSelected ? 12 : isHovered ? 10 : 8;
      if (isSelected || isHovered) {
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 3);
        gradient.addColorStop(0, colors.primaryAlpha(0.3));
        gradient.addColorStop(1, colors.primaryAlpha(0));
        ctx.fillStyle = gradient;
        ctx.beginPath(); ctx.arc(node.x, node.y, radius * 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.beginPath(); ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected || isHovered ? colors.primary : colors.accent;
      ctx.fill();
      ctx.fillStyle = colors.foreground;
      ctx.font = `${isSelected ? 'bold ' : ''}12px Nunito`;
      ctx.textAlign = 'center';
      ctx.fillText(node.title.length > 20 ? node.title.slice(0, 20) + '...' : node.title, node.x, node.y + radius + 16);
    });
    ctx.restore();
  }, [nodes, selectedNote, hoveredNode, zoom, pan, getThemeColors]);

  // Wheel zoom (mouse)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setZoom(prev => {
        const newZoom = Math.max(0.3, Math.min(3, prev + delta));
        const scale = newZoom / prev;
        setPan(p => ({
          x: mouseX - scale * (mouseX - p.x),
          y: mouseY - scale * (mouseY - p.y),
        }));
        return newZoom;
      });
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Touch handlers for mobile pinch-to-zoom and drag
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
      lastTouchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  }, [pan]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2 && lastTouchDist.current !== null && lastTouchCenter.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / lastTouchDist.current;
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const pivotX = cx - rect.left;
        const pivotY = cy - rect.top;
        setZoom(prev => {
          const newZoom = Math.max(0.3, Math.min(3, prev * scale));
          const s = newZoom / prev;
          setPan(p => ({
            x: pivotX - s * (pivotX - p.x),
            y: pivotY - s * (pivotY - p.y),
          }));
          return newZoom;
        });
      }
      lastTouchDist.current = dist;
      lastTouchCenter.current = { x: cx, y: cy };
    } else if (e.touches.length === 1 && isDragging) {
      setPan({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    lastTouchDist.current = null;
    lastTouchCenter.current = null;
  }, []);

  // Tap to select on mobile
  const handleTouchTap = useCallback((e: React.TouchEvent) => {
    if (e.changedTouches.length !== 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.changedTouches[0].clientX - rect.left - pan.x) / zoom;
    const y = (e.changedTouches[0].clientY - rect.top - pan.y) / zoom;
    const clicked = nodes.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 25; // Larger tap target on mobile
    });
    if (clicked) {
      const note = notes.find(n => n.id === clicked.id);
      if (note) onSelectNote(note);
    }
  }, [pan, zoom, nodes, notes, onSelectNote]);

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
    const hovered = nodes.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 20;
    });
    setHoveredNode(hovered?.id || null);
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  }, [isDragging, dragStart, pan, zoom, nodes]);

  const handleMouseUp = () => setIsDragging(false);

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    const clicked = nodes.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 20;
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
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-fade-in">
      {/* Header - responsive */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 sm:p-4 border-b border-border bg-background/80 z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-xl sm:text-2xl">🗺️</span>
          <h2 className="text-base sm:text-xl font-bold truncate">Graph View</h2>
          <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">
            {notes.length} notes • Use [[Note Title]] to create links
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Mobile note count */}
      <div className="absolute top-14 left-3 sm:hidden z-10">
        <span className="text-xs text-muted-foreground bg-card/80 px-2 py-1 rounded-md border border-border">
          {notes.length} notes
        </span>
      </div>

      {/* Controls */}
      <div className="absolute bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 bg-card border border-border rounded-xl p-1.5 sm:p-2 shadow-xl z-10">
        <Button variant="ghost" size="icon-sm" onClick={() => handleZoom(-0.2)}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-xs sm:text-sm w-12 sm:w-16 text-center">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="icon-sm" onClick={() => handleZoom(0.2)}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        <div className="w-px h-5 sm:h-6 bg-border mx-0.5 sm:mx-1" />
        <Button variant="ghost" size="icon-sm" onClick={resetView}>
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="absolute inset-0 top-14 sm:top-16 cursor-grab active:cursor-grabbing touch-none"
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
          onTouchEnd={(e) => { handleTouchTap(e); handleTouchEnd(); }}
        />
      </div>

      {/* Legend - hidden on small mobile */}
      <div className="absolute bottom-20 sm:bottom-6 right-3 sm:right-6 bg-card border border-border rounded-xl p-3 sm:p-4 shadow-xl z-10 hidden sm:block">
        <p className="text-xs font-medium text-muted-foreground mb-2">Legend</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span>Notes</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-0.5 bg-primary/30" />
            <span>Links</span>
          </div>
        </div>
      </div>
    </div>
  );
};
