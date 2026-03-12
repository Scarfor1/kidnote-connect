import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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
  onLinkNotes?: (sourceId: string, targetId: string) => void;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  title: string;
  connections: string[];
  phase: number;
  radius: number;
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

export const GraphView = ({ notes, selectedNote, onSelectNote, onClose, onLinkNotes }: GraphViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<NodePosition[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [linkFeedback, setLinkFeedback] = useState<string | null>(null);
  const animationRef = useRef<number>();
  const lastTouchDist = useRef<number | null>(null);
  const timeRef = useRef(0);
  const selectedNoteRef = useRef(selectedNote);
  const hoveredNodeRef = useRef(hoveredNode);
  const draggedNodeRef = useRef(draggedNode);
  const dropTargetRef = useRef(dropTarget);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const { toast } = useToast();

  useEffect(() => { selectedNoteRef.current = selectedNote; }, [selectedNote]);
  useEffect(() => { hoveredNodeRef.current = hoveredNode; }, [hoveredNode]);
  useEffect(() => { draggedNodeRef.current = draggedNode; }, [draggedNode]);
  useEffect(() => { dropTargetRef.current = dropTarget; }, [dropTarget]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);

  const getThemeColors = useCallback(() => {
    const style = getComputedStyle(document.documentElement);
    const primary = style.getPropertyValue('--primary').trim();
    const accent = style.getPropertyValue('--accent').trim();
    const foreground = style.getPropertyValue('--foreground').trim();
    const background = style.getPropertyValue('--background').trim();
    const muted = style.getPropertyValue('--muted-foreground').trim();
    const destructive = style.getPropertyValue('--destructive').trim();
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

  // Initialize nodes — tight cluster around center
  useEffect(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const cx = width / 2;
    const cy = height / 2;
    const count = notes.length;

    nodesRef.current = notes.map((note, i) => {
      const angle = (2 * Math.PI * i) / count;
      const r = Math.min(width, height) * 0.12 + Math.random() * 30;
      return {
        id: note.id,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: 0, vy: 0,
        title: note.title,
        connections: extractLinks(note.content),
        phase: Math.random() * Math.PI * 2,
        radius: 18,
        targetRadius: 18,
      };
    });
  }, [notes]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const animate = () => {
      timeRef.current += 0.006;
      const t = timeRef.current;
      const nodes = nodesRef.current;
      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;
      const currentDragged = draggedNodeRef.current;
      const currentDropTarget = dropTargetRef.current;

      const { width, height } = container.getBoundingClientRect();
      const centerX = width / 2;
      const centerY = height / 2;

      // --- Physics ---
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === currentDragged) continue; // skip dragged node

        // Strong centering force — prevents infinite expansion
        const toCenterX = (centerX - currentPan.x) / currentZoom - nodes[i].x;
        const toCenterY = (centerY - currentPan.y) / currentZoom - nodes[i].y;
        nodes[i].vx += toCenterX * 0.002;
        nodes[i].vy += toCenterY * 0.002;

        // Gentle ambient float
        nodes[i].vx += Math.sin(t * 0.5 + nodes[i].phase) * 0.015;
        nodes[i].vy += Math.cos(t * 0.4 + nodes[i].phase * 1.3) * 0.015;

        for (let j = i + 1; j < nodes.length; j++) {
          if (nodes[j].id === currentDragged) continue;
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          // Soft repulsion — weaker to keep them close
          if (dist < 120) {
            const repulsion = (120 - dist) * 0.02;
            const fx = (dx / dist) * repulsion;
            const fy = (dy / dist) * repulsion;
            nodes[i].vx -= fx;
            nodes[i].vy -= fy;
            nodes[j].vx += fx;
            nodes[j].vy += fy;
          }

          // Attraction for connected nodes — pulls them together
          const connected =
            nodes[i].connections.some(c => nodes[j].title.toLowerCase().includes(c)) ||
            nodes[j].connections.some(c => nodes[i].title.toLowerCase().includes(c));
          if (connected) {
            const ideal = 70;
            const force = (dist - ideal) * 0.008;
            nodes[i].vx += (dx / dist) * force;
            nodes[i].vy += (dy / dist) * force;
            nodes[j].vx -= (dx / dist) * force;
            nodes[j].vy -= (dy / dist) * force;
          }
        }

        // Heavy damping
        nodes[i].vx *= 0.88;
        nodes[i].vy *= 0.88;
        nodes[i].x += nodes[i].vx;
        nodes[i].y += nodes[i].vy;
      }

      // Animate radius
      for (const node of nodes) {
        const isSelected = selectedNoteRef.current?.id === node.id;
        const isHovered = hoveredNodeRef.current === node.id;
        const isDragged = currentDragged === node.id;
        const isDropTarget = currentDropTarget === node.id;
        node.targetRadius = isDragged ? 28 : isDropTarget ? 26 : isSelected ? 24 : isHovered ? 22 : 18;
        node.radius += (node.targetRadius - node.radius) * 0.1;
      }

      // --- Render ---
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = width * 2;
      canvas.height = height * 2;
      ctx.scale(2, 2);
      const colors = getThemeColors();

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(currentPan.x, currentPan.y);
      ctx.scale(currentZoom, currentZoom);

      // Draw connections — blobby organic curves
      nodes.forEach(node => {
        node.connections.forEach(connTitle => {
          const target = nodes.find(n => n.title.toLowerCase().includes(connTitle.toLowerCase()));
          if (target) {
            const dx = target.x - node.x;
            const dy = target.y - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const mx = (node.x + target.x) / 2;
            const my = (node.y + target.y) / 2;
            const offset = dist * 0.2;
            const cx = mx - (dy / (dist || 1)) * offset;
            const cy = my + (dx / (dist || 1)) * offset;
            const wave = Math.sin(t * 1.5 + node.phase) * 0.5 + 0.5;
            const alpha = Math.max(0.15, Math.min(0.5, 1 - dist / 400));

            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.quadraticCurveTo(
              cx + Math.sin(t + node.phase) * 4,
              cy + Math.cos(t + node.phase) * 4,
              target.x, target.y
            );
            ctx.strokeStyle = colors.primaryAlpha(alpha * (0.6 + wave * 0.4));
            ctx.lineWidth = 3 + wave * 2;
            ctx.lineCap = 'round';
            ctx.stroke();
          }
        });
      });

      // Draw drag-link preview line
      if (currentDragged && currentDropTarget) {
        const src = nodes.find(n => n.id === currentDragged);
        const tgt = nodes.find(n => n.id === currentDropTarget);
        if (src && tgt) {
          ctx.beginPath();
          ctx.setLineDash([8, 6]);
          ctx.moveTo(src.x, src.y);
          ctx.lineTo(tgt.x, tgt.y);
          ctx.strokeStyle = colors.primaryAlpha(0.7);
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.setLineDash([]);

          // Link icon at midpoint
          const lx = (src.x + tgt.x) / 2;
          const ly = (src.y + tgt.y) / 2;
          ctx.beginPath();
          ctx.arc(lx, ly, 14, 0, Math.PI * 2);
          ctx.fillStyle = colors.primaryAlpha(0.9);
          ctx.fill();
          ctx.fillStyle = colors.background;
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🔗', lx, ly);
        }
      }

      // Draw nodes — blobby organic circles with soft edges
      nodes.forEach(node => {
        const isSelected = selectedNoteRef.current?.id === node.id;
        const isHovered = hoveredNodeRef.current === node.id;
        const isDragged = currentDragged === node.id;
        const isDropTgt = currentDropTarget === node.id;
        const r = node.radius;
        const pulse = Math.sin(t * 1.2 + node.phase) * 0.5 + 0.5;

        // Blobby deformation
        const blobPhases = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];

        // Outer glow — always present
        const glowR = r * (2.5 + pulse * 0.8);
        const gradient = ctx.createRadialGradient(node.x, node.y, r * 0.3, node.x, node.y, glowR);
        if (isDragged || isDropTgt) {
          gradient.addColorStop(0, colors.primaryAlpha(0.5));
          gradient.addColorStop(0.5, colors.primaryAlpha(0.15));
          gradient.addColorStop(1, colors.primaryAlpha(0));
        } else if (isSelected) {
          gradient.addColorStop(0, colors.primaryAlpha(0.4));
          gradient.addColorStop(0.5, colors.primaryAlpha(0.1));
          gradient.addColorStop(1, colors.primaryAlpha(0));
        } else if (isHovered) {
          gradient.addColorStop(0, colors.primaryAlpha(0.3));
          gradient.addColorStop(0.6, colors.primaryAlpha(0.05));
          gradient.addColorStop(1, colors.primaryAlpha(0));
        } else {
          gradient.addColorStop(0, colors.accentAlpha(0.15 + pulse * 0.08));
          gradient.addColorStop(1, colors.accentAlpha(0));
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Blobby node shape using multiple overlapping circles
        const drawBlob = () => {
          ctx.beginPath();
          const points = 64;
          for (let p = 0; p < points; p++) {
            const angle = (p / points) * Math.PI * 2;
            let blobR = r;
            for (let b = 0; b < blobPhases.length; b++) {
              blobR += Math.sin(angle * 3 + blobPhases[b] + t * 0.8 + node.phase) * (r * 0.08);
            }
            const px = node.x + Math.cos(angle) * blobR;
            const py = node.y + Math.sin(angle) * blobR;
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
        };

        drawBlob();
        if (isDragged) {
          ctx.fillStyle = colors.primaryAlpha(0.95);
          ctx.shadowColor = colors.primaryAlpha(0.6);
          ctx.shadowBlur = 20;
        } else if (isDropTgt) {
          ctx.fillStyle = colors.primaryAlpha(0.8);
          ctx.shadowColor = colors.primaryAlpha(0.5);
          ctx.shadowBlur = 16;
        } else if (isSelected) {
          ctx.fillStyle = colors.primary;
          ctx.shadowColor = colors.primaryAlpha(0.4);
          ctx.shadowBlur = 14;
        } else if (isHovered) {
          ctx.fillStyle = colors.primaryAlpha(0.85);
          ctx.shadowColor = colors.primaryAlpha(0.3);
          ctx.shadowBlur = 10;
        } else {
          ctx.fillStyle = colors.accentAlpha(0.6 + pulse * 0.3);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        const labelAlpha = isDragged || isDropTgt || isSelected || isHovered ? 0.95 : 0.7;
        ctx.fillStyle = colors.foregroundAlpha(labelAlpha);
        ctx.font = `${isSelected || isDragged ? '700 ' : '500 '}${isSelected || isDragged ? 13 : 11}px Nunito, system-ui`;
        ctx.textAlign = 'center';
        const label = node.title.length > 16 ? node.title.slice(0, 16) + '…' : node.title;
        ctx.fillText(label, node.x, node.y + r + 20);

        // Drop target indicator text
        if (isDropTgt && currentDragged) {
          ctx.fillStyle = colors.primaryAlpha(0.9);
          ctx.font = '600 10px Nunito, system-ui';
          ctx.fillText('Drop to link', node.x, node.y - r - 10);
        }
      });

      ctx.restore();

      // Link feedback overlay
      if (linkFeedback) {
        ctx.fillStyle = colors.primaryAlpha(0.15);
        ctx.fillRect(0, 0, width, height);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [getThemeColors, notes, linkFeedback]);

  // Convert screen coords to graph coords
  const screenToGraph = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - panRef.current.x) / zoomRef.current,
      y: (clientY - rect.top - panRef.current.y) / zoomRef.current,
    };
  }, []);

  const findNodeAt = useCallback((gx: number, gy: number, excludeId?: string) => {
    return nodesRef.current.find(n => {
      if (excludeId && n.id === excludeId) return false;
      const dx = n.x - gx, dy = n.y - gy;
      return Math.sqrt(dx * dx + dy * dy) < n.radius + 10;
    });
  }, []);

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

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = screenToGraph(e.clientX, e.clientY);
    const node = findNodeAt(x, y);
    if (node) {
      setDraggedNode(node.id);
    } else {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { x, y } = screenToGraph(e.clientX, e.clientY);

    if (draggedNode) {
      const node = nodesRef.current.find(n => n.id === draggedNode);
      if (node) {
        node.x = x;
        node.y = y;
        node.vx = 0;
        node.vy = 0;
      }
      // Check for drop target
      const target = findNodeAt(x, y, draggedNode);
      setDropTarget(target?.id || null);
    } else if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else {
      const hovered = findNodeAt(x, y);
      setHoveredNode(hovered?.id || null);
    }
  }, [draggedNode, isPanning, panStart, screenToGraph, findNodeAt]);

  const handleMouseUp = useCallback(() => {
    if (draggedNode && dropTarget && onLinkNotes) {
      onLinkNotes(draggedNode, dropTarget);
      setLinkFeedback(`linked`);
      setTimeout(() => setLinkFeedback(null), 600);
    } else if (draggedNode && !dropTarget) {
      // Just a click — select
      const wasDragged = nodesRef.current.find(n => n.id === draggedNode);
      if (wasDragged) {
        const note = notes.find(n => n.id === wasDragged.id);
        if (note) onSelectNote(note);
      }
    }
    setDraggedNode(null);
    setDropTarget(null);
    setIsPanning(false);
  }, [draggedNode, dropTarget, onLinkNotes, notes, onSelectNote]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
    } else if (e.touches.length === 1) {
      const { x, y } = screenToGraph(e.touches[0].clientX, e.touches[0].clientY);
      const node = findNodeAt(x, y);
      if (node) {
        setDraggedNode(node.id);
      } else {
        setIsPanning(true);
        setPanStart({ x: e.touches[0].clientX - panRef.current.x, y: e.touches[0].clientY - panRef.current.y });
      }
    }
  }, [screenToGraph, findNodeAt]);

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
    } else if (e.touches.length === 1) {
      const { x, y } = screenToGraph(e.touches[0].clientX, e.touches[0].clientY);
      if (draggedNode) {
        const node = nodesRef.current.find(n => n.id === draggedNode);
        if (node) {
          node.x = x;
          node.y = y;
          node.vx = 0;
          node.vy = 0;
        }
        const target = findNodeAt(x, y, draggedNode);
        setDropTarget(target?.id || null);
      } else if (isPanning) {
        setPan({ x: e.touches[0].clientX - panStart.x, y: e.touches[0].clientY - panStart.y });
      }
    }
  }, [draggedNode, isPanning, panStart, screenToGraph, findNodeAt]);

  const handleTouchEnd = useCallback(() => {
    if (draggedNode && dropTarget && onLinkNotes) {
      onLinkNotes(draggedNode, dropTarget);
      setLinkFeedback(`linked`);
      setTimeout(() => setLinkFeedback(null), 600);
    }
    setDraggedNode(null);
    setDropTarget(null);
    setIsPanning(false);
    lastTouchDist.current = null;
  }, [draggedNode, dropTarget, onLinkNotes]);

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
            Drag a note onto another to link them
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Mobile hint */}
      <div className="absolute top-[52px] left-3 sm:hidden z-10">
        <span className="text-[10px] text-muted-foreground bg-card/70 backdrop-blur-sm px-2 py-0.5 rounded-full border border-border/50">
          {notes.length} notes · drag to link · tap to open
        </span>
      </div>

      {/* Link feedback toast */}
      {linkFeedback && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium shadow-lg animate-fade-in flex items-center gap-2">
          <Link className="w-4 h-4" />
          Notes linked!
        </div>
      )}

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
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </div>

      {/* Legend — desktop only */}
      <div className="absolute bottom-6 right-6 bg-card/70 backdrop-blur-md border border-border/50 rounded-2xl p-4 shadow-xl z-10 hidden md:block">
        <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">How to use</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-primary shadow-sm shadow-primary/30" />
            <span className="text-muted-foreground">Drag onto another to link</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-accent/70" />
            <span className="text-muted-foreground">Click to open note</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-5 h-[2px] bg-primary/40 rounded-full" />
            <span className="text-muted-foreground">[[linked]] connection</span>
          </div>
        </div>
      </div>
    </div>
  );
};
