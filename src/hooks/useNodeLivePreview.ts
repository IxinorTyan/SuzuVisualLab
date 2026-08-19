import { useState, useEffect, useRef, useCallback } from 'react';
import { resourceStore } from '../core/ResourceStore';
import { resolveUpstreamResourceId } from './useUpstreamResource';
import { processImageToSketch } from '../core/processors/sketch/sketchProcessor';
import { processImageToRgbSplit } from '../core/processors/rgbSplit/rgbSplitProcessor';
import { processImageToPixel } from '../core/processors/pixel/pixelProcessor';
import { processImageToAscii, AsciiDataData } from '../core/processors/ascii/asciiProcessor';
import { processImageToColorQuantization } from '../core/processors/colorQuantization/colorQuantizationProcessor';
import { processImageToMirage } from '../core/processors/mirage/mirageProcessor';

export interface NodeLivePreviewResult {
  previewUrl: string | null;
  asciiData: AsciiDataData | null;
  coverPreviewUrl?: string | null;
  innerPreviewUrl?: string | null;
  isProcessing: boolean;
  error: string | null;
}

export function useNodeLivePreview(
  nodeId: string,
  nodeType: string,
  draftParams: Record<string, any>,
  selected: boolean
): NodeLivePreviewResult {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [innerPreviewUrl, setInnerPreviewUrl] = useState<string | null>(null);
  const [asciiData, setAsciiData] = useState<AsciiDataData | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const previewTaskVersionRef = useRef<number>(0);
  const previewTimerRef = useRef<any>(null);
  const previousDraftJsonRef = useRef<string>('');
  const objectUrlsRef = useRef<Set<string>>(new Set());

  const createManagedUrl = useCallback((blob: Blob): string => {
    const url = URL.createObjectURL(blob);
    objectUrlsRef.current.add(url);
    return url;
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      objectUrlsRef.current.clear();
    };
  }, []);

  const triggerLivePreview = useCallback(async () => {
    if (!selected) return; // Only execute preview when node is selected
    const taskVersion = ++previewTaskVersionRef.current;

    const workflowData = (window as any).__SUZU_WORKFLOW_DATA__;

    setIsProcessing(true);
    setError(null);

    try {
      if (nodeType === 'output.mirage') {
        const coverResId = resolveUpstreamResourceId(nodeId, 'coverImage');
        const innerResId = resolveUpstreamResourceId(nodeId, 'innerImage');

        if (!coverResId || !innerResId) return;

        const coverRes = resourceStore.getResource(coverResId);
        const innerRes = resourceStore.getResource(innerResId);

        if (!coverRes?.blob || !innerRes?.blob) return;

        if (!selected || previewTaskVersionRef.current !== taskVersion) return;

        const result = await processImageToMirage(coverRes.blob, innerRes.blob, {
          isColored: draftParams.isColored ?? true,
          maxSize: 0,
          innerScale: draftParams.innerScale ?? 0.3,
          coverScale: draftParams.coverScale ?? 0.2,
          innerWeight: draftParams.innerWeight ?? 0.7,
          innerDesat: draftParams.innerDesat ?? 0,
          coverDesat: draftParams.coverDesat ?? 0
        });

        if (!selected || previewTaskVersionRef.current !== taskVersion) return;

        setPreviewUrl(createManagedUrl(result.blob));
        setCoverPreviewUrl(result.coverPreviewUrl);
        setInnerPreviewUrl(result.innerPreviewUrl);
        return;
      }

      let sourceResId: string | undefined = undefined;

      if (nodeType === 'input.image') {
        const activeNode = workflowData?.nodes?.find((n: any) => n.id === nodeId);
        sourceResId = activeNode?.parameters?.resourceId;
      } else {
        // 普通滤镜/输出节点：必须严格且只能获取直连上游输出的 resourceId，绝不能使用自身输出！
        sourceResId = resolveUpstreamResourceId(nodeId);
      }

      const inputRes = sourceResId ? resourceStore.getResource(sourceResId) : undefined;
      if (!inputRes || !inputRes.blob) return;

      // 直接使用全分辨率原始 Blob 进行实时预览，杜绝分辨率缩放产生的二次像素化失真
      const originalBlob = inputRes.blob;
      if (!selected || previewTaskVersionRef.current !== taskVersion) return;

      if (nodeType === 'filter.sketch') {
        const result = await processImageToSketch(originalBlob, {
          layer0Opacity: draftParams.layer0Opacity,
          layer1Opacity: draftParams.layer1Opacity,
          layer2Opacity: draftParams.layer2Opacity,
          layer2MinimumRadius: draftParams.layer2MinimumRadius,
          layer3Opacity: draftParams.layer3Opacity,
          layer3ColorMode: draftParams.layer3ColorMode,
          layer3CustomColor: draftParams.layer3CustomColor,
          layer3BlendMode: draftParams.layer3BlendMode
        });

        if (!selected || previewTaskVersionRef.current !== taskVersion) return;

        const tempRes = resourceStore.getResource(result.resourceId);
        if (tempRes && tempRes.blob) {
          setPreviewUrl(createManagedUrl(tempRes.blob));
        }
      } else if (nodeType === 'filter.rgbSplit') {
        const result = await processImageToRgbSplit(originalBlob, {
          noiseAmount: draftParams.noiseAmount,
          l1OffsetX: draftParams.l1OffsetX,
          l1OffsetY: draftParams.l1OffsetY,
          l1Opacity: draftParams.l1Opacity,
          l2OffsetX: draftParams.l2OffsetX,
          l2OffsetY: draftParams.l2OffsetY,
          l2Opacity: draftParams.l2Opacity,
          l3OffsetX: draftParams.l3OffsetX,
          l3OffsetY: draftParams.l3OffsetY,
          l3Opacity: draftParams.l3Opacity
        });

        if (!selected || previewTaskVersionRef.current !== taskVersion) return;

        const tempRes = resourceStore.getResource(result.resourceId);
        if (tempRes && tempRes.blob) {
          setPreviewUrl(createManagedUrl(tempRes.blob));
        }
      } else if (nodeType === 'filter.pixel') {
        const result = await processImageToPixel(originalBlob, {
          scaleRatio: draftParams.scaleRatio,
          enableThreshold: draftParams.enableThreshold,
          threshold: draftParams.threshold,
          thresholdMode: draftParams.thresholdMode,
          enableCustomColor: draftParams.enableCustomColor,
          customColor: draftParams.customColor
        });

        if (!selected || previewTaskVersionRef.current !== taskVersion) return;

        const tempRes = resourceStore.getResource(result.resourceId);
        if (tempRes && tempRes.blob) {
          setPreviewUrl(createManagedUrl(tempRes.blob));
        }
      } else if (nodeType === 'filter.colorQuantization') {
        const result = await processImageToColorQuantization(originalBlob, {
          k: draftParams.k,
          maxIterations: draftParams.maxIterations
        });

        if (!selected || previewTaskVersionRef.current !== taskVersion) return;

        const tempRes = resourceStore.getResource(result.resourceId);
        if (tempRes && tempRes.blob) {
          setPreviewUrl(createManagedUrl(tempRes.blob));
        }
      } else if (nodeType === 'output.ascii') {
        const result = await processImageToAscii(originalBlob, {
          preset: draftParams.preset,
          customCharSet: draftParams.customCharSet,
          invertCharSet: draftParams.invertCharSet,
          includeSpace: draftParams.includeSpace,
          resolutionCols: draftParams.resolutionCols,
          widthRatio: draftParams.widthRatio,
          heightRatio: draftParams.heightRatio,
          colorMode: draftParams.colorMode,
          textColor: draftParams.textColor,
          bgColor: draftParams.bgColor,
          fontFamily: draftParams.fontFamily,
          fontSize: draftParams.fontSize
        });

        if (!selected || previewTaskVersionRef.current !== taskVersion) return;

        const tempRes = resourceStore.getResource(result.resourceId);
        if (tempRes && tempRes.blob) {
          const text = await tempRes.blob.text();
          try {
            const parsed = JSON.parse(text) as AsciiDataData;
            setAsciiData(parsed);
          } catch (e) {
            // Ignore
          }
        }
      }
    } catch (err: any) {
      if (previewTaskVersionRef.current === taskVersion) {
        setError(err.message || '预览计算出错');
      }
    } finally {
      if (previewTaskVersionRef.current === taskVersion) {
        setIsProcessing(false);
      }
    }
  }, [nodeId, nodeType, draftParams, selected, createManagedUrl]);

  useEffect(() => {
    if (!selected) return;
    const currentDraftJson = JSON.stringify(draftParams);
    if (currentDraftJson === previousDraftJsonRef.current) return;
    previousDraftJsonRef.current = currentDraftJson;

    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }

    previewTimerRef.current = setTimeout(() => {
      triggerLivePreview();
    }, 100);

    return () => {
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
      }
    };
  }, [draftParams, selected, triggerLivePreview]);

  return {
    previewUrl,
    coverPreviewUrl,
    innerPreviewUrl,
    asciiData,
    isProcessing,
    error
  };
}
