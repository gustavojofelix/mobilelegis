import { Component, computed, inject, output, signal } from '@angular/core';
import { I18N_PIPES } from '../../core/pipes';
import { BoDoc } from '../bo.models';
import { BoService } from '../bo.service';
import { QualityMeter } from './quality-meter';

@Component({
  selector: 'bo-step-upload',
  imports: [QualityMeter, ...I18N_PIPES],
  template: `
    <div class="bo-drop" [class.over]="over()" (dragover)="$event.preventDefault(); over.set(true)" (dragleave)="over.set(false)" (drop)="onDrop($event)">
      <input #file type="file" accept="application/pdf,.pdf" multiple hidden (change)="onPick($event)" />
      <div class="bo-drop-ico"><i class="fa fa-cloud-upload"></i></div>
      <h2>{{ 'bo.upload.dropTitle' | t }}</h2>
      <p class="muted">{{ 'bo.upload.dropText' | t }}</p>
      <div class="bo-drop-actions">
        <button type="button" class="btn btn-yellow" (click)="file.click()"><i class="fa fa-folder-open"></i> {{ 'bo.upload.pick' | t }}</button>
        <button type="button" class="btn btn-light" (click)="bo.useExample()"><i class="fa fa-flask"></i> {{ 'bo.upload.example' | t }}</button>
      </div>
      <p class="small muted">{{ 'bo.upload.hint' | t }}</p>
      @if (busy()) { <p class="small"><i class="fa fa-spinner fa-spin"></i> {{ 'bo.upload.identifying' | t }}</p> }
    </div>

    @if (unknown().length) {
      <div class="notice notice-danger bo-gap">
        <i class="fa fa-question-circle"></i> {{ 'bo.upload.unknown' | t }}: <b>{{ unknown().join(', ') }}</b>
      </div>
    }

    @if (timeline().length) {
      <section class="card bo-gap">
        <div class="row-between">
          <h3 class="bo-h3"><i class="fa fa-road"></i> {{ 'bo.upload.timeline' | t }}</h3>
          <span class="small muted">{{ 'bo.upload.timelineHint' | t }}</span>
        </div>
        <div class="bo-timeline">
          @for (d of timeline(); track d.id; let first = $first) {
            <div class="bo-tl-node" [class.original]="d.role === 'original'">
              <span class="bo-tl-year">{{ d.date.slice(0, 4) }}</span>
              <span class="bo-tl-dot"><i class="fa" [class.fa-book]="d.role === 'original'" [class.fa-pencil]="d.role !== 'original'"></i></span>
              <div class="bo-doc-card">
                <span class="bo-pill" [class.pill-green]="d.role === 'original'">{{ (d.role === 'original' ? 'bo.upload.original' : 'bo.upload.amendment') | t }}</span>
                <h4>{{ d.title }}</h4>
                <p class="small muted">{{ d.subtitle }}</p>
                <p class="small">{{ d.date | dt }} · {{ pages(d) }} {{ 'bo.upload.pages' | t }}</p>
                <bo-quality [quality]="d.quality" [score]="d.score" />
                <p class="small muted bo-doc-file"><i class="fa fa-file-pdf-o"></i> {{ fileName(d) }}</p>
                <div class="bo-doc-actions">
                  @if (bo.fileUrls()[d.id]; as url) { <a [href]="url" target="_blank" rel="noopener" class="link-btn small"><i class="fa fa-eye"></i> {{ 'bo.upload.view' | t }}</a> }
                  <button type="button" class="link-btn small" (click)="bo.detach(d.id)"><i class="fa fa-trash-o"></i> {{ 'common.remove' | t }}</button>
                </div>
              </div>
            </div>
          }
        </div>

        @if (missing().length) {
          <div class="notice bo-gap"><i class="fa fa-lightbulb-o"></i> {{ 'bo.upload.missing' | t }}
            <b>{{ missingTitles() }}</b></div>
        }

        @if (manual(); as m) {
          <div class="bo-manual">
            <i class="fa fa-files-o"></i>
            <div><b>{{ m.title }}</b><p class="small muted">{{ m.subtitle }} · {{ 'bo.upload.manualNote' | t }}</p></div>
            <button type="button" class="link-btn small" (click)="bo.detach(m.id)"><i class="fa fa-trash-o"></i></button>
          </div>
        }
      </section>
    }

    <div class="bo-step-foot">
      <span class="small muted">{{ bo.coreDocsReady() ? ('bo.upload.ready' | t) : ('bo.upload.notReady' | t) }}</span>
      <button type="button" class="btn btn-yellow" [disabled]="!bo.coreDocsReady()" (click)="next.emit()"><i class="fa fa-bolt"></i> {{ 'bo.upload.start' | t }}</button>
    </div>
  `,
})
export class StepUpload {
  protected bo = inject(BoService);
  readonly next = output<void>();
  protected over = signal(false);
  protected busy = signal(false);
  protected unknown = signal<string[]>([]);

  protected timeline = computed(() => this.bo.attachedDocs().filter(d => d.role !== 'manual').sort((a, b) => a.date.localeCompare(b.date)));
  protected manual = computed(() => this.bo.attachedDocs().find(d => d.role === 'manual'));
  protected missing = computed(() => {
    const have = new Set(this.bo.state().attached.map(a => a.docId));
    return this.bo.docs().filter(d => d.role !== 'manual' && !have.has(d.id));
  });
  protected missingTitles = computed(() => this.missing().map(d => `${d.title} (${d.date.slice(0, 4)})`).join(', '));

  pages(d: BoDoc) { return this.bo.state().attached.find(a => a.docId === d.id)?.pages ?? d.pages; }
  fileName(d: BoDoc) { return this.bo.state().attached.find(a => a.docId === d.id)?.fileName ?? d.file; }

  async onDrop(ev: DragEvent) {
    ev.preventDefault();
    this.over.set(false);
    await this.add(Array.from(ev.dataTransfer?.files ?? []));
  }
  async onPick(ev: Event) {
    const input = ev.target as HTMLInputElement;
    await this.add(Array.from(input.files ?? []));
    input.value = '';
  }
  private async add(files: File[]) {
    if (!files.length) return;
    this.busy.set(true);
    this.unknown.set(await this.bo.attach(files));
    this.busy.set(false);
  }
}
