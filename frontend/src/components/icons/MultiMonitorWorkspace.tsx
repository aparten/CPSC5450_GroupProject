import socgif from "@/assets/gifs/soc.gif";

interface MultiMonitorWorkspaceProps {
  src?: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  imgClassName?: string;
}

export function MultiMonitorWorkspace({ 
  src = socgif,
  alt = "Multi-monitor workspace showing analytics dashboards, customer service, and global network map",
  width,
  height,
  className = "",
  imgClassName = ""
}: MultiMonitorWorkspaceProps) {
  const containerStyle: React.CSSProperties = {
    ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height && { height: typeof height === 'number' ? `${height}px` : height })
  };

  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={containerStyle}
    >
      <img 
        src={src} 
        alt={alt}
        className={`max-w-full h-auto ${imgClassName}`}
      />
    </div>
  );
}