import { logger } from '@/logger';
import fs from 'fs';

const fileName = 'streamers.json';

export enum StreamerListErrors {
    FULL = 'La liste de streamers est pleine.',
    UNKNOWN = 'Erreur inconnue.',
    NONE = "Aucune erreur.",
}

export class StreamerList {
    private streamers: string[] = [];

    constructor() {
        this.loadStreamers();
    }

    public addStreamer(streamer: string): StreamerListErrors {
        if (!this.streamers.includes(streamer)) {
            if (this.streamers.length === 99) {
                logger.warn('La liste de streamers est pleine.');
                return StreamerListErrors.FULL;
            }
            this.streamers.push(streamer);
            this.saveStreamers();
            return StreamerListErrors.NONE;
        }
        return StreamerListErrors.UNKNOWN;
    }

    public removeStreamer(streamer: string): StreamerListErrors {
        const index = this.streamers.indexOf(streamer);
        if (index !== -1) {
            this.streamers.splice(index, 1);
            this.saveStreamers();
            return StreamerListErrors.NONE;
        }
        return StreamerListErrors.UNKNOWN;
    }

    public getStreamers(): string[] {
        return this.streamers;
    }

    private loadStreamers(): void {
        try {
            const data = fs.readFileSync(fileName, 'utf-8');
            this.streamers = JSON.parse(data);
            logger.debug('Streamers chargés :', this.streamers);
        } catch (error) {
            logger.error('Erreur lors de la lecture du fichier streamers.json :', error);
            this.createStreamersFile();
            logger.info('Fichier streamers.json créé, veuillez ajouter des streamers.');
            process.kill(process.pid, "SIGINT");
        }
    }

    private createStreamersFile(): void {
        try {
            fs.writeFileSync(fileName, '["wiibleyde"]');
        } catch (error) {
            logger.error('Erreur lors de la création du fichier streamers.json :', error);
        }
    }

    private saveStreamers(): void {
        try {
            fs.writeFileSync(fileName, JSON.stringify(this.streamers, null, 2));
        } catch (error) {
            logger.error('Erreur lors de l\'écriture du fichier streamers.json :', error);
        }
    }
}