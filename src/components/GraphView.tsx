import { useEffect, useRef, useState, useCallback } from 'react';
import { Note } from '@/hooks/useNotes';
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GraphViewProps {
  notes: Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note) => void;
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

// Extract [[links]] from content
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

  // Initialize nodes with physics
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
        vx: 0,
        vy: 0,
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
        
        // Apply forces
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const dx = newNodes[j].x - newNodes[i].x;
            const dy = newNodes[j].y - newNodes[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            
            // Repulsion
            const repulsion = 5000 / (dist * dist);
            const fx = (dx / dist) * repulsion;
            const fy = (dy / dist) * repulsion;
            
            newNodes[i].vx -= fx;
            newNodes[i].vy -= fy;
            newNodes[j].vx += fx;
            newNodes[j].vy += fy;

            // Attraction for connected nodes
            const hasConnection = 
              newNodes[i].connections.some(c => 
                newNodes[j].title.toLowerCase().includes(c)
              ) ||
              newNodes[j].connections.some(c => 
                newNodes[i].title.toLowerCase().includes(c)
              );

            if (hasConnection) {
              const attraction = dist * 0.01;
              newNodes[i].vx += (dx / dist) * attraction;
              newNodes[i].vy += (dy / dist) * attraction;
              newNodes[j].vx -= (dx / dist) * attraction;
              newNodes[j].vy -= (dy / dist) * attraction;
            }
          }

          // Damping
          newNodes[i].vx *= 0.9;
          newNodes[i].vy *= 0.9;
          
          // Apply velocity
          newNodes[i].x += newNodes[i].vx;
          newNodes[i].y += newNodes[i].vy;
        }

        return newNodes;
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);
    
    // Stop after 3 seconds
    const timeout = setTimeout(() => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }, 3000);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      clearTimeout(timeout);
    };
  }, [nodes.length]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Apply transformations
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw connections
    ctx.strokeStyle = 'hsla(16, 90%, 65%, 0.2)';
    ctx.lineWidth = 1.5;
    
    nodes.forEach(node => {
      node.connections.forEach(connTitle => {
        const target = nodes.find(n => 
          n.title.toLowerCase().includes(connTitle.toLowerCase())
        );
        if (target) {
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        }
      });
    });

    // Draw nodes
    nodes.forEach(node => {
      const isSelected = selectedNote?.id === node.id;
      const isHovered = hoveredNode === node.id;
      const radius = isSelected ? 12 : isHovered ? 10 : 8;

      // Glow effect
      if (isSelected || isHovered) {
        const gradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, radius * 3
        );
        gradient.addColorStop(0, 'hsla(16, 90%, 65%, 0.3)');
        gradient.addColorStop(1, 'hsla(16, 90%, 65%, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected 
        ? 'hsl(16, 90%, 65%)' 
        : isHovered 
          ? 'hsl(16, 90%, 70%)' 
          : 'hsl(200, 80%, 60%)';
      ctx.fill();

      // Node label
      ctx.fillStyle = 'hsl(45, 20%, 95%)';
      ctx.font = `${isSelected ? 'bold ' : ''}12px Nunito`;
      ctx.textAlign = 'center';
      ctx.fillText(
        node.title.length > 20 ? node.title.slice(0, 20) + '...' : node.title,
        node.x,
        node.y + radius + 16
      );
    });

    ctx.restore();
  }, [nodes, selectedNote, hoveredNode, zoom, pan]);

  // Handle mouse events
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

    // Check hover
    const hovered = nodes.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 20;
    });
    setHoveredNode(hovered?.id || null);

    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
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
      if (note) {
        onSelectNote(note);
      }
    }
  };

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(0.5, Math.min(2, prev + delta)));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-fade-in">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 border-b border-border bg-background/80">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗺️</span>
          <h2 className="text-xl font-bold">Graph View</h2>
          <span className="text-sm text-muted-foreground">
            {notes.length} notes • Use [[Note Title]] to create links
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-card border border-border rounded-xl p-2 shadow-xl">
        <Button variant="ghost" size="icon-sm" onClick={() => handleZoom(-0.2)}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="icon-sm" onClick={() => handleZoom(0.2)}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button variant="ghost" size="icon-sm" onClick={resetView}>
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="absolute inset-0 top-16 cursor-grab active:cursor-grabbing">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
        />
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 right-6 bg-card border border-border rounded-xl p-4 shadow-xl">
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
