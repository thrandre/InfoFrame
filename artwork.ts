module Artwork {

	export interface PhotoData 
	{
		title: string;
		tags: string[];
		source_original: string;
		source_large: string;
		width: number;
		height: number;
	}
	
	export interface IPhotoProvider
	{
		search( minWidth: number, minHeight: number ): JQueryPromise<PhotoData[]>
	}

	export class Flickr implements IPhotoProvider 
	{

		constructor( private apiKey: string, private userId: string ) { }

		private getApiUrl() {
			return "https://api.flickr.com/services/rest/?method=flickr.favorites.getPublicList&api_key=" + this.apiKey + "&user_id=" + this.userId + "&extras=o_dims,url_o,url_l,tags&per_page=500&format=json&nojsoncallback=1";
		}

		private parsePhoto( data ): PhotoData 
		{
				title: data.title,
				tags: data.tags.split( " " ).map( ( tag ) => tag.toLowerCase() ),
				source_original: data.url_o,
				source_large: data.url_l,
				width: data.width_o,
				height: data.height_o
			};
		}

		search( minWidth: number, minHeight: number ): JQueryPromise<PhotoData[]> {
			return $.getJSON( this.getApiUrl() ).then( ( data ) => {
				return data.photos.photo
					.filter( ( photo ) =>
						photo.width_o >= minWidth
						&& photo.height_o >= minHeight )
					.map( ( photo ) => this.parsePhoto( photo ) );
			});
		}

	}

} 